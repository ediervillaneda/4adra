# Migración Firebase → Cloudflare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sacar Firebase del repo y dejar el backend corriendo como un Worker de Cloudflare (Hono + D1 + Better Auth/Google), publicado en `https://4adra.edier.me`, con `GET /api/v1/me` funcionando de punta a punta.

**Architecture:** Un solo Worker `4adra` sirve `/api/v1/*` (Hono → casos de uso → dominio ← repositorios D1), `/api/auth/*` (Better Auth) y `/*` (Static Assets, placeholder hasta la PWA). Las capas `domain/` y `application/` no cambian, salvo el puerto `AuthenticationProvider`. Solo se reemplazan los adaptadores de infraestructura y presentación.

**Tech Stack:** TypeScript estricto, Node 24 (tooling), Cloudflare Workers + Wrangler, Hono, Cloudflare D1, Better Auth (Google) con `kysely-d1`, `uuid` (v7), Vitest + `@cloudflare/vitest-pool-workers`, ajv + js-yaml (contrato).

**Spec:** `docs/superpowers/specs/2026-11-11-migracion-cloudflare-design.md`

## Global Constraints

- Nombre del Worker: `4adra`. Base D1: `4adra-db`, binding `DB`. Dominio: `4adra.edier.me` (custom domain). Local: `http://localhost:8787`.
- Rutas: API en `/api/v1/*`, Better Auth en `/api/auth/*`, todo lo demás va a Static Assets.
- Montos en `TEXT` decimal exacto, nunca `REAL`/`float`. Fechas en `TEXT` ISO-8601 UTC con milisegundos (`2026-11-11T15:04:05.000Z`). IDs UUID v7 en `TEXT PRIMARY KEY`.
- `audit_logs` es solo inserción: un trigger bloquea `UPDATE` y `DELETE`.
- Cookie de sesión `HttpOnly; Secure; SameSite=Lax`, del mismo origen. Único proveedor: Google.
- Secretos: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Nunca van en el repo; solo existe `backend/.dev.vars.example` sin valores.
- Cobertura mínima: Domain 100 %, Application 95 %, Infrastructure 80 %, Presentation 70 %.
- Pruebas deterministas: reloj inyectado, sin red real, sin llamar nunca a Google.
- Nombres por rol (`D1UserRepository`, `BetterAuthAuthenticationProvider`). Prohibidos `Manager`/`Helper`/`Util`/`Common`/`Data`/`Misc`.
- El dominio no importa Hono, Better Auth, D1 ni `Request`/`Headers`.
- OpenAPI: solo cambian `servers` y `securitySchemes`; rutas, schemas y sobre de respuesta quedan intactos.
- Git Flow (ADR-013): todo va en `feature/migracion-cloudflare` → PR a `develop`. No se pushea a `main`.

## Review Focus

1. **Cookie ausente, basura o expirada** → 401 `UNAUTHENTICATED` con sobre de error, nunca 500. Cubierto en Task 3 (provider) y Task 4 (middleware).
2. **Cuenta de Google sin nombre o sin foto** → `displayName` cae al correo y `photoUrl` queda `null`, sin lanzar excepción. Cubierto en Task 3.
3. **Ruta `/api/...` inexistente** → 404 JSON `NOT_FOUND` con sobre, no el `index.html` de la SPA. Cubierto en Task 4.
4. **Falla al escribir la auditoría** → la respuesta al cliente no se altera. Una mutación con status ≥ 400 no se audita. Cubierto en Task 4.
5. **D1 caída o error SQL inesperado** → 500 `INTERNAL_ERROR` con `requestId`, sin filtrar el mensaje interno. Cubierto en Task 4.

---

### Task 1: Pasar el runner de pruebas de Jest a Vitest

Cambio mecánico. Todo sigue en Express/Firebase, pero las pruebas corren en Vitest.

**Files:**
- Create: `backend/vitest.config.ts`, `backend/vitest.contract.config.ts`, `backend/vitest.integration.config.ts` (temporal, para Firestore; se reemplaza en Task 2)
- Delete: `backend/jest.config.js`, `backend/jest.contract.config.js`, `backend/jest.integration.config.js`
- Modify: `backend/package.json`, `backend/tsconfig.json`, todos los `backend/test/**/*.test.ts`

**Interfaces:**
- Produces: scripts `npm test` (unitarias + cobertura), `npm run test:integration` y `npm run test:contract`, todos con Vitest.

- [ ] **Step 1: Dependencias.** Quitar `jest`, `ts-jest` y `@types/jest`. Agregar `vitest` y `@vitest/coverage-v8`.
- [ ] **Step 2: `vitest.config.ts`.**
  - `include: ['test/unit/**/*.test.ts']`, `environment: 'node'`.
  - Coverage `v8` con `include` `src/domain/**`, `src/application/**`, `src/presentation/**`.
  - Umbrales por glob: domain 100, application 95, presentation 70.
  - `globals: false`: cada test importa `describe`/`it`/`expect`/`vi` de `vitest`.
- [ ] **Step 3: Configs de contrato e integración.** `vitest.contract.config.ts` usa `include: ['test/contract/**/*.test.ts']`. `vitest.integration.config.ts` usa `include: ['test/integration/**/*.integration.test.ts']`.
- [ ] **Step 4: Migrar los tests.** Reemplazar `jest.fn` → `vi.fn`, `jest.Mock` → `Mock` (de `vitest`) y `jest.mock` → `vi.mock`. Agregar los imports de `vitest`. No cambiar ninguna aserción.
- [ ] **Step 5: Scripts y tipos.**
  - `"test": "vitest run --coverage"`, `"test:contract": "vitest run -c vitest.contract.config.ts"`, `"test:integration": "vitest run -c vitest.integration.config.ts"`.
  - En `tsconfig.json`, quitar los tipos de jest si estaban referenciados.
- [ ] **Step 6: Verificar.**
  - Run: `cd backend && npm test && npm run test:contract && npm run lint && npm run typecheck`
  - Expected: todo PASS, con la misma cantidad de tests que antes de la migración (contar con `vitest run --reporter=verbose`) y la cobertura sobre los umbrales.
- [ ] **Step 7: Commit.** `git commit -m "test: migrar runner de pruebas de Jest a Vitest"`

---

### Task 2: Wrangler, D1, migración inicial y repositorios D1

**Files:**
- Create:
  - `backend/wrangler.jsonc`, `backend/migrations/0001_init.sql`, `backend/.dev.vars.example`, `backend/public/index.html`
  - `backend/src/infrastructure/d1/D1UserRepository.ts`, `backend/src/infrastructure/d1/D1AuditLogWriter.ts`, `backend/src/infrastructure/d1/isoDate.ts`
  - `backend/test/integration/applyMigrations.ts`, `backend/test/integration/d1UserRepository.integration.test.ts`, `backend/test/integration/d1AuditLogWriter.integration.test.ts`
  - `backend/worker-configuration.d.ts` (generado con `wrangler types`)
- Modify: `backend/vitest.integration.config.ts` (pasa a pool Workers), `backend/package.json`, `.gitignore`
- Delete: `backend/test/integration/firestoreUserRepository.integration.test.ts`

**Interfaces:**
- Consumes: `UserRepository`, `AuditLogWriter`, `User`, `AuditLogEntry` (sin cambios).
- Produces:
  - `class D1UserRepository implements UserRepository { constructor(database: D1Database) }`
  - `class D1AuditLogWriter implements AuditLogWriter { constructor(database: D1Database, generateId: () => string) }`
  - `toIsoDate(date: Date): string` y `fromIsoDate(value: string): Date` en `isoDate.ts`
  - Tipo global `Env` con `DB: D1Database`, `ASSETS: Fetcher`, `BETTER_AUTH_URL: string`, `BETTER_AUTH_SECRET: string`, `GOOGLE_CLIENT_ID: string`, `GOOGLE_CLIENT_SECRET: string`

- [ ] **Step 1: Dependencias.** Dev: `wrangler`, `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-types`. Prod: `uuid` (≥ 10, para `v7`).
- [ ] **Step 2: `wrangler.jsonc`.**
  - `name: "4adra"`, `main: "src/index.ts"`, `compatibility_date: "2026-11-01"`, `compatibility_flags: ["nodejs_compat"]`.
  - `assets`: `{ directory: "./public", binding: "ASSETS", run_worker_first: ["/api/*"], not_found_handling: "single-page-application" }`.
  - `d1_databases`: `[{ binding: "DB", database_name: "4adra-db", database_id: "00000000-0000-0000-0000-000000000000", migrations_dir: "migrations" }]`. El id real se completa en Task 8.
  - `routes`: `[{ pattern: "4adra.edier.me", custom_domain: true }]`, `vars`: `{ BETTER_AUTH_URL: "https://4adra.edier.me" }`.
  - Si Cloudflare rechaza un nombre que empieza por dígito, usar `app-4adra` / `app-4adra-db` y registrarlo en el spec.
- [ ] **Step 3: `.dev.vars.example`** con `BETTER_AUTH_URL=http://localhost:8787` y las tres claves secretas vacías. En `.gitignore`, agregar `.wrangler/` y `backend/.dev.vars`.
- [ ] **Step 4: `public/index.html`.** Página placeholder: `<title>4adra</title>` y "4adra — próximamente". La reemplaza la PWA en el spec 2.
- [ ] **Step 5: `0001_init.sql`.**
  - **Tablas de Better Auth, esquema core con nombres camelCase como los espera Better Auth:**
    - `"user"`: `id`, `name`, `email` UNIQUE, `emailVerified` INTEGER, `image`, `createdAt`, `updatedAt`
    - `session`: `id`, `expiresAt`, `token` UNIQUE, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`, `userId` FK → `user` ON DELETE CASCADE
    - `account`: `id`, `accountId`, `providerId`, `userId` FK, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt`, `updatedAt`
    - `verification`: `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`
  - **`users` (perfil de dominio):** `id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE RESTRICT`, `display_name`, `email`, `photo_url` (nullable), `preferred_currency`, `language`, `time_zone`, `status` con `CHECK (status IN ('ACTIVE','DISABLED'))`, `created_at`, `updated_at`. Todas `NOT NULL` salvo `photo_url`.
  - **`audit_logs`:** `id TEXT PRIMARY KEY`, `actor_id`, `entity`, `entity_id`, `operation`, `request_id`, `occurred_at`, `created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`, más `CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id)`.
  - **Triggers:** `audit_logs_no_update` y `audit_logs_no_delete`, ambos `BEFORE ... BEGIN SELECT RAISE(ABORT, 'audit_logs es inmutable'); END;`.
- [ ] **Step 6: `vitest.integration.config.ts` con el pool Workers.**
  - `readD1Migrations('migrations')` se expone como binding `TEST_MIGRATIONS`, con `wrangler.configPath: './wrangler.jsonc'`.
  - `setupFiles: ['test/integration/applyMigrations.ts']`, que ejecuta `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` importando desde `cloudflare:test`.
  - Si la versión instalada del pool cambió su API, seguir la doc actual del paquete; la intención queda fija: D1 local con migraciones aplicadas antes de cada archivo.
- [ ] **Step 7: Escribir los tests de integración que fallan.**

```ts
// d1UserRepository.integration.test.ts (env de 'cloudflare:test')
// beforeEach: INSERT INTO "user" (id='usr_ana', email='ana@example.com', ...) para satisfacer la FK
it('shouldReturnNullWhenUserDoesNotExist')        // findById(UserId.fromString('usr_ana')) → null
it('shouldRoundTripAllUserFields')               // save(user) y luego findById: mismos 10 campos; createdAt.toISOString() === '2026-07-13T12:00:00.000Z'
it('shouldUpdateExistingUserOnSecondSave')       // save dos veces con status 'DISABLED' → findById(...).status === 'DISABLED', y COUNT(*) = 1
it('shouldRejectProfileWithoutAuthUser')         // save de un User con id 'usr_ghost' → rejects (FK)

// d1AuditLogWriter.integration.test.ts
it('shouldInsertAuditEntry')                     // write({actorId:'usr_ana', entity:'/api/v1/groups', entityId:'/api/v1/groups', operation:'POST', requestId:'req-1', occurredAt:new Date('2026-07-13T12:00:00.000Z')}) → la fila existe con occurred_at '2026-07-13T12:00:00.000Z'
it('shouldRejectUpdateOnAuditLogs')              // UPDATE audit_logs SET operation='X' → rejects con /inmutable/
it('shouldRejectDeleteOnAuditLogs')              // DELETE FROM audit_logs → rejects con /inmutable/
```

- [ ] **Step 8: Correr los tests.** Run: `npm run test:integration`. Expected: FAIL porque los módulos `D1UserRepository` y `D1AuditLogWriter` todavía no existen.
- [ ] **Step 9: Implementar los repositorios.**
  - **`D1UserRepository`:**
    - `findById`: `SELECT` por `id` y mapear con `User.create(...)` y `fromIsoDate`.
    - `save`: `INSERT ... ON CONFLICT(id) DO UPDATE SET` todas las columnas excepto `id` y `created_at`.
  - **`D1AuditLogWriter.write`:** `INSERT` con `generateId()` y `toIsoDate(entry.occurredAt)`.
  - **Composición:** se inyecta `generateId = () => uuidv7()`.
- [ ] **Step 10: Generar tipos y scripts.**
  - `npx wrangler types` genera `worker-configuration.d.ts`, que se commitea.
  - Scripts: `"cf-typegen": "wrangler types"`, `"db:migrate:local": "wrangler d1 migrations apply 4adra-db --local"`, `"db:migrate:remote": "wrangler d1 migrations apply 4adra-db --remote"`.
- [ ] **Step 11: Verificar.** Run: `npm run test:integration && npm run db:migrate:local`. Expected: 7 tests PASS y las migraciones aplicadas sin error.
- [ ] **Step 12: Commit.** `git commit -m "feat(backend): D1 con migración inicial y repositorios D1"`

---

### Task 3: Puerto de sesión y `BetterAuthAuthenticationProvider`

**Files:**
- Create:
  - `backend/src/domain/auth/SessionCredential.ts`
  - `backend/src/infrastructure/auth/createAuth.ts`, `backend/src/infrastructure/auth/BetterAuthAuthenticationProvider.ts`
  - `backend/test/unit/domain/auth/SessionCredential.test.ts`, `backend/test/unit/infrastructure/auth/BetterAuthAuthenticationProvider.test.ts`
  - `backend/test/integration/betterAuthSession.integration.test.ts`
- Modify: `backend/src/domain/auth/AuthenticationProvider.ts`
- Delete: `backend/src/infrastructure/firebase/` y su test

**Interfaces:**
- Consumes: el tipo `Env` de Task 2.
- Produces:
  - `class SessionCredential { static fromCookieHeader(value: string | null | undefined): SessionCredential; toString(): string; isEmpty(): boolean }`. Valor opaco: no parsea cookies.
  - `interface AuthenticationProvider { resolveSession(credential: SessionCredential): Promise<AuthenticatedActor> }`. Reemplaza a `verifyIdToken`.
  - `interface AuthConfig { database: D1Database; secret: string; baseURL: string; google?: { clientId: string; clientSecret: string }; emailAndPasswordEnabled?: boolean }`
  - `createAuth(config: AuthConfig): Auth` (tipo `ReturnType<typeof betterAuth>`)
  - `type SessionLookup = (headers: Headers) => Promise<{ user: { id: string; email: string; name: string | null; image?: string | null } } | null>`
  - `class BetterAuthAuthenticationProvider implements AuthenticationProvider { constructor(lookupSession: SessionLookup) }`

- [ ] **Step 1: Tests que fallan.**

```ts
// SessionCredential.test.ts
it('shouldBeEmptyForNullUndefinedOrBlank')      // fromCookieHeader(null|undefined|'  ').isEmpty() === true
it('shouldKeepRawHeaderValue')                  // fromCookieHeader('a=1; b=2').toString() === 'a=1; b=2'

// BetterAuthAuthenticationProvider.test.ts (lookupSession = vi.fn())
it('shouldRejectEmptyCredentialWithoutCallingLookup')   // rejects UnauthenticatedException; lookup no se llama
it('shouldRejectWhenNoSession')                         // lookup → null ⇒ UnauthenticatedException
it('shouldRejectWhenLookupThrows')                      // lookup rejects Error('boom') ⇒ UnauthenticatedException (no se propaga 'boom')
it('shouldPassCookieHeaderToLookup')                    // lookup recibe Headers con get('cookie') === 'better-auth.session_token=abc'
it('shouldMapSessionUserToActor')                       // {id:'usr_ana', email:'ana@example.com', name:'Ana Pérez', image:'https://x/y.png'} ⇒ actor con esos valores
it('shouldMapBlankNameAndMissingImageToNull')           // name:'  ', image:undefined ⇒ displayName null, photoUrl null
```

- [ ] **Step 2: Correr y verificar que fallan.** Run: `npx vitest run test/unit/domain/auth test/unit/infrastructure/auth`. Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implementar.**
  - `SessionCredential`.
  - Cambiar el puerto a `resolveSession`.
  - `BetterAuthAuthenticationProvider.resolveSession`: si la credencial está vacía, lanza; arma `new Headers({ cookie })`, llama `lookupSession` y mapea a `AuthenticatedActor` con `UserId.fromString` y `Email.fromString`.
- [ ] **Step 4: `createAuth`.**
  - `betterAuth({ database: { dialect: new D1Dialect({ database }), type: 'sqlite' }, ... })` con `kysely-d1`.
  - `basePath: '/api/auth'`, `secret`, `baseURL`, `socialProviders.google` (si se configuró), `emailAndPassword.enabled = config.emailAndPasswordEnabled ?? false`.
  - `advanced.database.generateId = () => uuidv7()`.
  - Cookies: `advanced.useSecureCookies = baseURL.startsWith('https://')`.
  - Si Better Auth ya soporta el binding D1 directo (`database: env.DB`), se puede usar en lugar de `kysely-d1`; la integración de Step 5 decide.
- [ ] **Step 5: Test de integración contra D1 real (pool Workers).** `betterAuthSession.integration.test.ts`:
  - Crea `createAuth({ database: env.DB, secret: 'test-secret-at-least-32-characters-long', baseURL: 'http://localhost:8787', emailAndPasswordEnabled: true })`.
  - `shouldResolveActorFromRealSessionCookie`: `auth.api.signUpEmail({ body: { email: 'ana@example.com', password: 'Password123!', name: 'Ana Pérez' }, asResponse: true })`, toma `set-cookie` y lo pasa a `new BetterAuthAuthenticationProvider((h) => auth.api.getSession({ headers: h })).resolveSession(SessionCredential.fromCookieHeader(cookie))`. Expected: `email` = `ana@example.com` y `userId` es un UUID v7 (`/^[0-9a-f]{8}-[0-9a-f]{4}-7/`).
  - `shouldRejectForgedCookie`: la cookie `better-auth.session_token=forged` rechaza con `UnauthenticatedException`.
  - Este test valida que el DDL de `0001_init.sql` es compatible con Better Auth. Si falla por columnas, se corrige el SQL, no el test.
- [ ] **Step 6: Mantener el repo compilando.**
  - El middleware Express `authenticate` pasa a leer el encabezado `cookie` y llamar a `resolveSession(SessionCredential.fromCookieHeader(...))`. Es transitorio; Task 4 lo reescribe en Hono.
  - `compositionRoot` deja de construir el proveedor de Firebase. Hasta Task 4 usa un proveedor que siempre lanza `UnauthenticatedException`.
  - Los fakes `verifyIdToken` de los tests pasan a `resolveSession`.
- [ ] **Step 7: Verificar.** Run: `npm run typecheck && npm test && npm run test:contract && npm run test:integration`. Expected: PASS.
- [ ] **Step 8: Commit.** `git commit -m "feat(backend): puerto de sesión y proveedor Better Auth (Google)"`

---

### Task 4: Presentación en Hono, punto de entrada del Worker y retiro de Express/Firebase

**Files:**
- Modify:
  - `backend/src/presentation/http/createApp.ts`
  - `backend/src/presentation/http/middleware/{requestId,authenticate,auditTrail,errorHandler}.ts`
  - `backend/src/presentation/http/users/meController.ts`
  - `backend/src/presentation/compositionRoot.ts`, `backend/src/index.ts`
  - `backend/package.json`, `backend/tsconfig.json`, `backend/tsconfig.build.json` (borrar si ya no aplica), `backend/eslint.config.js`
  - Tests de `test/unit/presentation/**` y `test/contract/me.contract.test.ts`
- Create:
  - `backend/src/presentation/http/AppEnv.ts`
  - `backend/test/integration/me.integration.test.ts`
- Delete:
  - `backend/src/presentation/http/asyncHandler.ts`
  - `backend/src/infrastructure/firestore/`, `backend/src/infrastructure/audit/FirestoreAuditLogWriter.ts` y sus tests

**Interfaces:**
- Consumes: `D1UserRepository` y `D1AuditLogWriter` (Task 2); `createAuth`, `BetterAuthAuthenticationProvider` y `SessionCredential` (Task 3).
- Produces:
  - `type AppEnv = { Variables: { requestId: string; actor: AuthenticatedActor } }`
  - `interface AppDependencies { authenticationProvider: AuthenticationProvider; auditLogWriter: AuditLogWriter; getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase; authHandler: (request: Request) => Promise<Response>; generateRequestId: () => string }`
  - `createApp(dependencies: AppDependencies): Hono<AppEnv>`
  - `composeApp(env: Env): Hono<AppEnv>`
  - `export default { fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> }` en `index.ts`

- [ ] **Step 1: Reescribir los tests de presentación con `app.request(path, init, env, executionCtx)`.** Fake `executionCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() }`. Se conservan los nombres de test existentes y se agregan:

```ts
// authenticate.test.ts
it('shouldRespond401EnvelopeWithoutCookie')               // GET /api/v1/me sin Cookie → 401, body.error.code 'UNAUTHENTICATED', meta.requestId presente
it('shouldPassCookieHeaderAsSessionCredential')           // resolveSession recibe credential.toString() === 'better-auth.session_token=abc'
// auditTrail.test.ts
it('shouldScheduleAuditWriteWithWaitUntilOnSuccessfulMutation') // POST 201 → waitUntil llamado 1 vez; write con {entity:'/api/v1/groups', operation:'POST'}
it('shouldNotAuditFailedMutation')                        // POST 400 → write no llamado
it('shouldNotAlterResponseWhenAuditWriteFails')           // write rejects → status 201 igual; la promesa a waitUntil no rechaza (se captura y se registra con console.error)
// errorHandler.test.ts
it('shouldMapUnexpectedErrorTo500WithoutLeakingMessage')  // handler lanza Error('SQLITE_ERROR: no such table') → 500 'INTERNAL_ERROR', el body no contiene 'SQLITE'
// createApp.test.ts
it('shouldReturnJson404ForUnknownApiRoute')               // GET /api/v1/nope → 404, error.code 'NOT_FOUND'
it('shouldDelegateAuthRoutesToAuthHandler')               // GET /api/auth/session → authHandler llamado con Request cuyo url termina en '/api/auth/session'
it('shouldNotRequireSessionForAuthRoutes')                // /api/auth/* no pasa por authenticate
```

- [ ] **Step 2: Contrato.** `me.contract.test.ts` usa `createApp(...).request('/api/v1/me', { headers: { cookie: 'better-auth.session_token=valid' } }, {}, executionCtx)` con un fake `resolveSession`. Valida contra `components/schemas/User` igual que hoy.
- [ ] **Step 3: Correr y verificar que fallan.** Run: `npm test && npm run test:contract`. Expected: FAIL (siguen las implementaciones en Express).
- [ ] **Step 4: Implementar en Hono.**
  - `createApp`: `new Hono<AppEnv>().basePath('/api')`.
  - **Orden de registro:**
    1. `requestId` (global, con `generateRequestId`).
    2. `app.on(['GET','POST'], '/auth/*', (c) => deps.authHandler(c.req.raw))`.
    3. `use('/v1/*', auditTrail)`.
    4. `use('/v1/*', authenticate)`.
    5. `get('/v1/me', meController)`.
  - **`app.notFound`** responde con `errorEnvelope('NOT_FOUND', 'Recurso no encontrado.', requestId)` y status 404.
  - **`app.onError`** es el `errorHandler`. `STATUS_BY_CODE` agrega `NOT_FOUND: 404`. Un error no-dominio se registra con `console.error` junto al `requestId` y responde un 500 genérico.
  - **`auditTrail`:** `await next()`; si el método muta y `c.res.status < 400`, ejecuta `c.executionCtx.waitUntil(writer.write(entry).catch(logAuditFailure))`. `entity` y `entityId` toman `c.req.path`.
- [ ] **Step 5: `compositionRoot` e `index.ts`.**
  - `composeApp(env)` crea el auth con `createAuth({ database: env.DB, secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL, google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } })`.
  - Conecta los repositorios D1, `GetCurrentUserProfileUseCase(userRepository, () => new Date())`, `authHandler: (r) => auth.handler(r)` y `generateRequestId: () => crypto.randomUUID()`.
  - `index.ts`: `fetch` llama `composeApp(env).fetch(request, env, ctx)`. Static Assets atiende todo lo que no sea `/api/*` sin pasar por el Worker.
- [ ] **Step 6: Limpieza de dependencias y configuración.**
  - Quitar `express`, `@types/express`, `firebase-admin`, `firebase-functions`, `supertest`, `@types/supertest` y `rimraf`. Agregar `hono`, `better-auth` y `kysely-d1`.
  - `tsconfig.json`: `module: "ES2022"`, `moduleResolution: "Bundler"`, `lib: ["ES2022"]`, `types: ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"]` y `include` con `worker-configuration.d.ts`.
  - ESLint pasa a `eslint.config.mjs` (ESM).
  - `package.json`: quitar `"main"`. Scripts: `"dev": "wrangler dev"`, `"build": "wrangler deploy --dry-run --outdir dist"`, `"deploy": "wrangler deploy"`. `description`: "Backend de 4adra: Cloudflare Worker sobre Clean Architecture + DDD Lite."
- [ ] **Step 7: Integración de punta a punta (pool Workers).** `me.integration.test.ts`, usando `SELF.fetch` de `cloudflare:test`.
  - **Configuración de Miniflare:** se agregan los bindings de prueba `BETTER_AUTH_SECRET='test-secret-at-least-32-characters-long'`, `BETTER_AUTH_URL='http://localhost:8787'` y Google vacíos.
  - **Siembra de sesión:** el test crea su propio `createAuth({ ...mismo secret/DB, emailAndPasswordEnabled: true })` y hace `signUpEmail` para obtener una cookie firmada con el mismo secreto. El Worker la acepta porque comparten DB y secreto; producción nunca habilita email/contraseña.
  - `shouldReturnProfileForValidSession`: `GET /api/v1/me` con esa cookie → 200, `data.email === 'ana@example.com'` y una fila en `users`.
  - `shouldReturn401WithoutSession`: sin cookie → 401 `UNAUTHENTICATED`.
- [ ] **Step 8: Verificar.**
  - Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:integration && npm run test:contract && npm run build`. Expected: todo PASS.
  - Run: `grep -rniE "firebase|firestore|express" src test`. Expected: sin resultados.
- [ ] **Step 9: Humo local.**
  - `cp .dev.vars.example .dev.vars` con `BETTER_AUTH_SECRET` aleatorio, luego `npm run db:migrate:local && npm run dev`.
  - `curl -i localhost:8787/api/v1/me` → 401 JSON.
  - `curl -i localhost:8787/` → HTML placeholder.
  - `curl -i localhost:8787/api/v1/nope` → 404 JSON.
- [ ] **Step 10: Commit.** `git commit -m "feat(backend): presentación en Hono y Worker de Cloudflare; retirar Express y Firebase"`

---

### Task 5: Limpieza de raíz, Android y CI/CD

**Files:**
- Delete:
  - `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `.firebaserc.example`
  - `android/`, `web/src/environments/environment.ts`, `docs/examples/FirestoreStructure.json`
  - `.github/workflows/deploy-firebase.yml`, `.github/workflows/firebase-config.yml`, `.github/workflows/android.yml`
- Create: `.github/workflows/deploy-cloudflare.yml`, `docs/examples/D1Schema.sql`
- Modify: `.github/workflows/backend.yml`, `.github/workflows/release.yml`, `.github/workflows/web.yml`, `.gitignore`

- [ ] **Step 1: Borrar los archivos listados.** En `.gitignore`, quitar el bloque `# Firebase` y cualquier entrada de Android/Gradle.
- [ ] **Step 2: `backend.yml`.**
  - Quitar el JDK, Firebase CLI y Emulator.
  - Pasos: format:check, lint, typecheck, `npm test`, `npm run db:migrate:local`, `npm run test:integration`, `npm run test:contract`, `npm audit --omit=dev --audit-level=high` y `npm run build`.
  - Se mantiene la guarda de `backend/package.json`.
- [ ] **Step 3: `deploy-cloudflare.yml`.**
  - Disparo: `push` a `main` con `paths` `backend/**` y el propio workflow. `concurrency` `deploy-cloudflare-production`.
  - **Guarda:** si faltan `secrets.CLOUDFLARE_API_TOKEN` o `secrets.CLOUDFLARE_ACCOUNT_ID`, `ready=false` y `::notice::`. Mismo patrón que el workflow borrado.
  - **Pasos:** `npm ci`, `npm run db:migrate:remote`, `npx wrangler deploy`, con env `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
- [ ] **Step 4: `release.yml` y `web.yml`.** Reemplazar las menciones a Firebase o a `deploy-firebase.yml` por Cloudflare o `deploy-cloudflare.yml`. Sin cambios de lógica.
- [ ] **Step 5: `docs/examples/D1Schema.sql`.** Esquema completo de referencia de las 14 tablas del spec §3, con FKs, `UNIQUE (group_id, user_id)` en `group_members` y montos en `TEXT`. No se ejecuta; documenta el destino.
- [ ] **Step 6: Verificar.**
  - Run: `npx --yes @action-validator/cli .github/workflows/*.yml` (o `actionlint` si está disponible). Expected: sin errores.
  - Run: `git ls-files | grep -iE "firebase|firestore|android|google-services"`. Expected: sin resultados.
- [ ] **Step 7: Commit.** `git commit -m "chore: retirar Firebase y Android; CI/CD con Cloudflare"`

---

### Task 6: Contrato OpenAPI y `docs/api/Auth.md`

**Files:**
- Modify: `docs/api/openapi.yaml`, `docs/api/Auth.md`, `docs/api/Expenses.md`, `docs/ApiSpecification.md`

- [ ] **Step 1: `openapi.yaml`.**
  - `servers`: `[{ url: https://4adra.edier.me/api/v1, description: production }, { url: http://localhost:8787/api/v1, description: local }]`.
  - `securitySchemes`: `cookieAuth: { type: apiKey, in: cookie, name: better-auth.session_token }`. Se elimina `bearerAuth` y la seguridad global pasa a `[{ cookieAuth: [] }]`.
  - Se reemplazan las descripciones que mencionan Firebase. Nada más cambia.
- [ ] **Step 2: `Auth.md`.** Flujo:
  1. El cliente navega a `/api/auth/sign-in/social` con `provider=google` (POST de Better Auth).
  2. Google redirige al callback `/api/auth/callback/google`.
  3. Se emite la cookie y luego se llama a `GET /api/v1/me`.
  4. Cierre de sesión con `/api/auth/sign-out`.
  - Errores: 401 `UNAUTHENTICATED`.
- [ ] **Step 3: Actualizar menciones.** En `Expenses.md` y `ApiSpecification.md`, cambiar base URL y autenticación.
- [ ] **Step 4: Verificar.** Run: `npm --prefix backend run test:contract` y el linter de `openapi-lint.yml` (`npx @redocly/cli lint docs/api/openapi.yaml`, o el comando que use ese workflow). Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "docs(api): servers en 4adra.edier.me y autenticación por cookie de sesión"`

---

### Task 7: Documentación, ADRs y CLAUDE.md

**Files (Modify):**
- `AGENTS.md`, `docs/AGENTS.md`, `CLAUDE.md`, `README.md`, `backend/README.md`, `web/README.md`
- `docs/Architecture.md`, `DatabaseSchema.md`, `Security.md`, `Deployment.md`, `DevelopmentGuide.md`, `TestingGuide.md`, `CodingStandards.md`, `Workflows.md`, `UISpecification.md`, `Roadmap.md`, `Glossary.md`, `TODO.md`, `Decisions.md`, `BusinessRules.md`, `DomainModel.md`
- `docs/domain/Money.md`, `docs/checklists/*.md`, `docs/diagrams/*.drawio` (solo etiquetas)
- ~~`docs/superpowers/plans/2026-07-14-backend-scaffold-fase0.md` (nota de obsoleto)~~ — eliminado el 2026-11-11 (limpieza); queda en el historial de git

- [ ] **Step 1: ADRs en `Decisions.md`.**
  - ADR-002, 003, 008, 009, 010 y 012 pasan a "Estado: Reemplazado por ADR-0xx" sin borrar su contenido.
  - Se agregan ADR-014 (Workers + Static Assets + Hono), 015 (D1, montos `TEXT`, migraciones SQL), 016 (Better Auth + Google, cookie del mismo origen) y 017 (solo PWA), con contexto, decisión y consecuencias según el spec §2–§5.
- [ ] **Step 2: Diseño técnico.**
  - `Architecture.md` con el diagrama del spec §2.
  - `DatabaseSchema.md` reescrito en SQL/D1 (tablas, tipos, índices, triggers, migraciones) remitiendo a `docs/examples/D1Schema.sql`.
  - `Security.md`: sesiones/cookies, secretos con Wrangler, bindings en lugar de reglas Firestore; la matriz de roles no cambia.
  - `Deployment.md`: spec §12 paso a paso.
  - `TestingGuide.md`: Vitest y pool Workers.
  - `CodingStandards.md`: quitar Kotlin/Android.
  - `UISpecification.md` y `Roadmap.md`: solo PWA; Android pasa a "descartado (ADR-017)".
  - Tabla de equivalencias del spec §5 en `Architecture.md`.
- [ ] **Step 3: `CLAUDE.md`, `AGENTS.md` y `README.md`.**
  - Estado real: backend Worker con `GET /api/v1/me`; web pendiente (spec 2); sin Android.
  - Comandos reales de `backend/package.json`: `dev`, `test`, `test:integration`, `test:contract`, `lint`, `typecheck`, `build`, `db:migrate:local` y `deploy`.
  - Stack actualizado y diagrama nuevo.
- [ ] **Step 4: Checklists, Fase0 y el resto.** Reemplazar las tareas de Firebase por sus equivalentes en Cloudflare y marcar como hecho lo ya cumplido. Nota de obsoleto al inicio del plan de 2026-07-14.
- [ ] **Step 5: Verificar el criterio de éxito 1 del spec.**
  - Run: `grep -rniE "firebase|firestore|adra-54655|cloudfunctions|google-services|kotlin|jetpack" --exclude-dir=.git --exclude-dir=node_modules . | grep -v "package-lock"`
  - Expected: solo ADRs marcados como reemplazados, la nota del plan histórico, el spec y este plan.
- [ ] **Step 6: Commit.** `git commit -m "docs: arquitectura Cloudflare (Workers + D1 + Better Auth), ADR-014..017"`

---

### Task 8: Aprovisionamiento real y primer despliegue (con el usuario, en navegador y terminal)

Acciones externas. Cada una se confirma con el usuario antes de ejecutarla.

- [ ] **Step 1: Login de Wrangler.** El usuario ejecuta `! npx --prefix backend wrangler login` y autoriza en el navegador. Verificar con `npx wrangler whoami` (debe mostrar la cuenta).
- [ ] **Step 2: Crear la base.** `npx wrangler d1 create 4adra-db`. Copiar el `database_id` a `wrangler.jsonc`, hacer commit y luego `npm run db:migrate:remote`.
- [ ] **Step 3: Revisar el dominio.** En el dashboard, confirmar que la zona `edier.me` está en la cuenta (es requisito del custom domain).
- [ ] **Step 4: Cliente OAuth en Google Cloud Console** (navegador).
  - Tipo "Web application". Orígenes `https://4adra.edier.me` y `http://localhost:8787`. Redirects `https://4adra.edier.me/api/auth/callback/google` y `http://localhost:8787/api/auth/callback/google`.
  - El usuario pega el id y el secreto directamente en `wrangler secret put GOOGLE_CLIENT_ID` y `wrangler secret put GOOGLE_CLIENT_SECRET`, y en su `.dev.vars` local. Nunca en el chat.
  - `wrangler secret put BETTER_AUTH_SECRET` con un valor aleatorio de 32 bytes o más.
- [ ] **Step 5: API token y secrets de GitHub.**
  - Crear el token en el dashboard con la plantilla "Edit Cloudflare Workers" más permiso D1 Edit.
  - Cargarlo con `gh secret set CLOUDFLARE_API_TOKEN` y `gh secret set CLOUDFLARE_ACCOUNT_ID`; el usuario pega los valores en el prompt de `gh`.
- [ ] **Step 6: Primer deploy.**
  - Lo hace el flujo normal: PR a `develop`, release a `main` y luego `deploy-cloudflare.yml`. Opcionalmente, un `npx wrangler deploy` manual autorizado por el usuario.
  - Verificar: `https://4adra.edier.me/` → placeholder; `/api/v1/me` → 401 JSON; login con Google en `/api/auth/sign-in/social` → `GET /api/v1/me` 200.
- [ ] **Step 7: Firebase.** Recordar al usuario que elimine el proyecto `adra-54655` en console.firebase.google.com. Es una acción destructiva: solo la hace el usuario, o la asistimos con su confirmación explícita.
