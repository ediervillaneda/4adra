# Migración de plataforma: Firebase → Cloudflare (Workers + D1 + Better Auth)

> **Proyecto:** 4adra
> **Fecha:** 2026-11-11
> **Estado:** Propuesto (pendiente de revisión)
> **Rama:** `feature/migracion-cloudflare`
> **Subproyecto:** 1 de 2 (el 2 es el scaffold de la PWA Angular, con spec propio)

## 1. Intención

**Qué pidió el usuario:**

- Eliminar toda referencia a Firebase del proyecto.
- Usar una base de datos sugerida (se eligió relacional: Cloudflare D1).
- Publicar con Cloudflare.
- Un solo cliente: PWA responsive para PC y celular.
- URL online `4adra.edier.me`; en local, `localhost`.
- No renombrar carpeta ni repo, pero no dejar restos del nombre viejo ni del proyecto Firebase `adra-54655`.

**Decisiones acordadas en la conversación de diseño:**

| Tema | Decisión |
|---|---|
| Hosting | Todo en Cloudflare, sin servidores propios |
| Clientes | Solo PWA (Angular). Se elimina Android nativo por completo |
| Autenticación | Better Auth dentro del Worker, solo "Continuar con Google" |
| Base de datos | Cloudflare D1 (SQLite administrado) |
| Dominio | `4adra.edier.me`, con app y `/api` bajo el mismo origen; local en `localhost` |
| Renombrado | Ninguno externo; limpieza de nombres viejos |
| Contrato OpenAPI | Se autoriza cambiar `servers` y `securitySchemes` (sesión por cookie). Endpoints y payloads no cambian |

**Criterios de éxito:**

1. `grep -ri "firebase\|firestore\|adra-54655\|cloudfunctions"` sobre el repo solo encuentra referencias históricas explícitas: ADRs marcados como reemplazados, la nota del plan histórico y este spec.
2. `GET /api/v1/me` funciona de punta a punta en `wrangler dev` con una sesión de Better Auth y D1 local.
3. Pasan las pruebas unitarias, de integración (D1 emulada) y de contrato (OpenAPI), con los umbrales de cobertura vigentes.
4. `wrangler deploy` desde CI publica en `4adra.edier.me` cuando existen los secrets. Si no existen, el job se omite sin fallar.
5. La documentación describe la arquitectura nueva sin contradicciones.

**Fuera de alcance:**

- Scaffold de la PWA Angular: es el subproyecto 2.
- Tablas de grupos, gastos, etc. (solo se documentan).
- R2, Web Push y Cron Triggers (solo se documentan).
- Enlace mágico por correo.
- Eliminar el proyecto Firebase en Google Cloud: es una acción manual del usuario.

## 2. Arquitectura

```text
https://4adra.edier.me
 └─ Cloudflare Worker "4adra"  (backend/wrangler.jsonc)
     ├─ /api/v1/*    → Hono (Presentation) → Application → Domain ← Infrastructure → D1
     ├─ /api/auth/*  → Better Auth (Google OAuth, sesiones en D1)
     └─ /*           → Workers Static Assets (build de la PWA; mientras no exista, un index.html mínimo)
```

- **Un Worker con archivos estáticos, en lugar de Pages + Worker separados.** Da un solo despliegue y un solo origen, así que no hay CORS y la cookie de sesión funciona en el mismo dominio.
- **Hono reemplaza a Express**, porque es nativo del runtime de Workers. Los handlers y middlewares conservan su responsabilidad y estructura:
  - `requestId`
  - `authenticate`
  - `auditTrail`
  - `errorHandler`
  - `responseEnvelope`
  - `meController`
- **`domain/` y `application/` no cambian su lógica.** Única excepción: el puerto `AuthenticationProvider`, cuya firma pasa de `verifyIdToken(idToken)` a `resolveSession(credential: SessionCredential)`. `SessionCredential` es un valor opaco (el encabezado `Cookie` crudo) que el dominio no interpreta, así que el dominio sigue sin conocer HTTP.
- `GetCurrentUserProfileUseCase` ya crea el `User` en el primer acceso, con `DEFAULT_PROFILE_SETTINGS`. Se conserva tal cual.

**Sustitución de adaptadores:**

| Antes | Después |
|---|---|
| `infrastructure/firebase/FirebaseAuthenticationProvider` | `infrastructure/auth/BetterAuthAuthenticationProvider` |
| `infrastructure/firestore/FirestoreUserRepository` | `infrastructure/d1/D1UserRepository` |
| `infrastructure/audit/FirestoreAuditLogWriter` | `infrastructure/d1/D1AuditLogWriter` |
| `presentation/compositionRoot.ts` (firebase-admin) | `presentation/compositionRoot.ts` (recibe `env` del Worker: `DB`, secretos) |
| `src/index.ts` (`onRequest`) | `src/index.ts` (`export default { fetch }`) |

**Entornos:**

| Entorno | Cómo corre | URL |
|---|---|---|
| local | `wrangler dev`, con D1 local emulada y secretos en `backend/.dev.vars` (ignorado por git) | `http://localhost:8787` |
| preview | `wrangler versions upload` en PRs (opcional, si hay secrets) | `*.workers.dev` |
| production | `wrangler deploy` desde `main` | `https://4adra.edier.me` |

## 3. Datos (D1)

- **Tablas.** Las colecciones de `DatabaseSchema.md` pasan a tablas `snake_case`:
  - `users`, `groups`, `group_members`, `invitations`, `expenses`, `expense_splits`, `settlements`, `balances`
  - `categories`, `exchange_rates`, `calculation_profiles`, `notifications`, `audit_logs`, `app_settings`
- **Montos:** `TEXT` decimal exacto, nunca `REAL`. Lo validan los value objects (`Money`, `Decimal.js`). Aplica también a `percentage` y `exchange_rate`. `shares` es `INTEGER`.
- **Fechas:** `TEXT` ISO-8601 UTC con milisegundos (`2026-11-11T15:04:05.000Z`).
- **IDs:** UUID v7 generados en el backend, en `TEXT PRIMARY KEY`.
- **Integridad:**
  - `PRAGMA foreign_keys` está activo en D1; se usan FKs reales.
  - `UNIQUE (group_id, user_id)` en `group_members` reemplaza al ID determinista del ADR-010.
  - Las escrituras atómicas de varios registros usan `db.batch([...])`.
- **Auditoría inmutable:** `audit_logs` solo admite inserción. Triggers `BEFORE UPDATE` y `BEFORE DELETE` con `RAISE(ABORT, ...)`, que refuerzan el ADR-006.
- **Migraciones:** `backend/migrations/NNNN_descripcion.sql`, aplicadas con `wrangler d1 migrations apply 4adra-db [--local|--remote]`.
- **Migración inicial (`0001_init.sql`):** crea solo lo que el código usa hoy:
  - `users`
  - `audit_logs`, con sus triggers
  - las tablas de Better Auth (`user`, `session`, `account`, `verification`, generadas con su CLI y revisadas a mano)

  El resto de tablas queda especificado en `DatabaseSchema.md` y se crea en la fase que las implemente.
- **Relación con Better Auth.** El `user.id` de Better Auth es el `UserId` del dominio. La tabla `users` (perfil de dominio: moneda, idioma, zona horaria, estado) referencia `user(id)`. Better Auth administra la identidad; el dominio administra el perfil.

## 4. Autenticación

- **Better Auth:**
  - Adaptador Kysely/D1 sobre el binding `DB`.
  - Único proveedor social: Google.
  - Rutas montadas en `/api/auth/*`.
- **Sesión:** cookie `HttpOnly; Secure; SameSite=Lax` del mismo origen. En local, `Secure` se relaja porque `localhost` lo permite.
- **Middleware `authenticate` (Hono):**
  1. Toma el encabezado `Cookie` y llama a `provider.resolveSession(...)`.
  2. Si no hay sesión válida, responde `UnauthenticatedException` → 401 con el sobre de error actual.
  3. Si la hay, construye el `AuthenticatedActor` (`userId`, `email`, `displayName`, `photoUrl`) desde la sesión.
- **Secretos:** `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
  - En producción, con `wrangler secret put`.
  - En local, en `.dev.vars`.
  - En el repo solo existe `.dev.vars.example` sin valores.
- **Configuración en Google Cloud Console** (manual, documentada en `Deployment.md`): un OAuth Client con orígenes `https://4adra.edier.me` y `http://localhost:8787`, y callback `/api/auth/callback/google`.

## 5. Servicios equivalentes (solo documentación en este spec)

| Firebase | Reemplazo | Cuándo |
|---|---|---|
| Storage | Cloudflare R2 (binding en el Worker; el cliente nunca accede directo) | Fase que implemente adjuntos/avatares |
| Cloud Messaging | Web Push estándar (VAPID) enviado desde el Worker | Fase 3 (notificaciones) |
| Cloud Scheduler | Cron Triggers del Worker | Cuando exista un job programado |
| Emulator Suite | `wrangler dev` / Miniflare + `@cloudflare/vitest-pool-workers` | Desde este spec |
| Reglas Firestore/Storage (deny-all) | Innecesarias: D1 y R2 solo son accesibles vía binding del Worker | Desde este spec |

## 6. Contrato OpenAPI (`docs/api/openapi.yaml`)

Cambios autorizados explícitamente por el usuario:

- `servers`: `https://4adra.edier.me/api/v1` (production) y `http://localhost:8787/api/v1` (local).
- `securitySchemes`: se reemplaza `bearerAuth` ("Firebase ID Token") por `cookieAuth` (`type: apiKey`, `in: cookie`, con el nombre de cookie de Better Auth), y la seguridad global pasa a `cookieAuth`.
- Se actualizan las descripciones que mencionan Firebase.
- **Sin cambios** en rutas, parámetros, schemas, códigos de estado ni sobre de respuesta.
- `docs/api/Auth.md` se reescribe para el flujo de Google vía Better Auth.

## 7. Pruebas

- **Jest → Vitest.** `@cloudflare/vitest-pool-workers` requiere Vitest. Cambios mecánicos: `jest.fn` → `vi.fn`, configs nuevos y los mismos tres grupos:
  - `test` (unitarias, en pool Node)
  - `test:integration` (pool Workers, D1 local con migraciones aplicadas)
  - `test:contract`
- **Unitarias de dominio y aplicación:** se migran sin cambiar aserciones.
- **Unitarias de infraestructura:** `D1UserRepository`, `D1AuditLogWriter` y `BetterAuthAuthenticationProvider` (con dobles de prueba).
- **Unitarias de presentación:** los middlewares Hono y `createApp`, ejercitados con `app.request(...)`, que reemplaza a supertest.
- **Integración:**
  - Ida y vuelta de `users` en D1.
  - Inmutabilidad de `audit_logs`: un `UPDATE` o `DELETE` falla.
  - `GET /api/v1/me` con una sesión sembrada en D1.
- **Contrato:** la respuesta de `/api/v1/me` valida contra `openapi.yaml` (ajv), como hoy.
- **Cobertura mínima** (sin cambios): Domain 100 %, Application 95 %, Infrastructure 80 %, Presentation 70 %.
- **Determinismo:** reloj inyectado y sin red real; Google OAuth nunca se llama en pruebas.

## 8. CI/CD (GitHub Actions, Git Flow ADR-013)

| Workflow | Acción |
|---|---|
| `deploy-firebase.yml` | Eliminar |
| `firebase-config.yml` | Eliminar |
| `android.yml` | Eliminar |
| `backend.yml` | Lint, typecheck, Vitest (las tres suites) y `wrangler d1 migrations apply --local` en limpio. Sin Firebase Emulator |
| `deploy-cloudflare.yml` (nuevo) | Con push a `main`: build, luego `wrangler d1 migrations apply 4adra-db --remote` y `wrangler deploy`. Guarda: si faltan `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`, se omite con `::notice::` |
| `web.yml` | Se mantiene como guarda hasta el subproyecto 2; se quitan referencias a Firebase |
| `release.yml` | Se quitan referencias a Firebase |
| `openapi-lint.yml` | Sin cambios funcionales |

## 9. Archivos

**Eliminar:**

- `firebase.json`
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `.firebaserc.example`
- `android/` completo (incluye `google-services.json`)
- `web/src/environments/environment.ts`
- `docs/examples/FirestoreStructure.json`
- `backend/src/infrastructure/firebase/`
- `backend/src/infrastructure/firestore/`
- `FirestoreAuditLogWriter` y sus pruebas
- `jest*.config.js`

**Crear:**

- `backend/wrangler.jsonc`:
  - nombre `4adra`
  - `main`
  - `compatibility_date`
  - `compatibility_flags: ["nodejs_compat"]`
  - binding D1 `DB` → `4adra-db`
  - `assets` (directorio de la PWA y `run_worker_first` para `/api/*`)
  - `routes` con `4adra.edier.me` como custom domain
- `backend/migrations/0001_init.sql`
- `backend/.dev.vars.example`
- `backend/vitest*.config.ts`
- `backend/src/infrastructure/d1/*`
- `backend/src/infrastructure/auth/*`
- `docs/examples/D1Schema.sql`, el esquema completo de referencia
- `.github/workflows/deploy-cloudflare.yml`

**Modificar:**

- `backend/package.json`: quitar `firebase-admin`, `firebase-functions`, `express`, `jest`, `supertest` y `ts-jest`. Agregar `hono`, `better-auth`, `kysely-d1` (o el adaptador D1 vigente de Better Auth), `wrangler`, `vitest`, `@cloudflare/vitest-pool-workers` y `@cloudflare/workers-types`. Scripts nuevos: `dev`, `deploy`, `db:migrate:local` y `db:migrate:remote`.
- `.gitignore`: quitar entradas de Firebase y agregar `.wrangler/` y `.dev.vars`.
- Todo lo listado en §10.

## 10. Documentación

**Reescribir las secciones afectadas en:**

- `AGENTS.md` (raíz y `docs/`)
- `CLAUDE.md`: estado real del repo y comandos reales
- `README.md`
- `docs/Architecture.md`
- `docs/DatabaseSchema.md`: pasa a SQL/D1
- `docs/Security.md`: matriz de controles sin reglas Firestore, con sesiones, cookies y secretos
- `docs/Deployment.md`: Cloudflare, dominio, secretos y OAuth de Google
- `docs/DevelopmentGuide.md`
- `docs/TestingGuide.md`: Vitest + Miniflare
- `docs/CodingStandards.md`: quitar Kotlin/Android
- `docs/Workflows.md`
- `docs/UISpecification.md`: solo PWA
- `docs/Roadmap.md`
- `docs/Glossary.md`
- `docs/TODO.md`
- `docs/checklists/*`
- `docs/api/Auth.md`, `docs/api/Expenses.md`, `docs/ApiSpecification.md`
- `docs/domain/Money.md`
- Etiquetas en `docs/diagrams/*.drawio`
- `backend/README.md`, `web/README.md`

**ADRs (`docs/Decisions.md`):**

- Se marcan como **Reemplazados** (sin borrarse):
  - ADR-002 (Cloud Functions)
  - ADR-003 (Firestore)
  - ADR-008 (stack Fase 0, en lo relativo a Firebase y Android)
  - ADR-009 (reglas sin acceso cliente)
  - ADR-010 (IDs deterministas de `groupMembers`)
  - ADR-012 (paquete Android)
- Se agregan:
  - **ADR-014**: Cloudflare Workers + Static Assets como backend y hosting únicos, con Hono.
  - **ADR-015**: D1 como persistencia relacional, con montos `TEXT` decimal y migraciones SQL.
  - **ADR-016**: Better Auth con Google OAuth y sesión por cookie del mismo origen.
  - **ADR-017**: solo PWA; se elimina Android nativo.

**Plan histórico** `docs/superpowers/plans/2026-07-14-backend-scaffold-fase0.md`: eliminado el 2026-11-11 en la limpieza del repositorio; queda en el historial de git.

## 11. Manejo de errores

- Sin cambios en la traducción dominio → HTTP (`errorHandler`).
- Errores nuevos de infraestructura: falla de D1 o de Better Auth no disponible. Se registran con el `requestId` y se responden como 500/503 con el sobre estándar, sin filtrar detalles internos.
- Violación de inmutabilidad de auditoría: error de infraestructura, nunca silenciado.

## 12. Acciones manuales del usuario (documentadas en `Deployment.md`)

1. En Cloudflare:
   - Crear la D1 `4adra-db` y copiar su `database_id` a `wrangler.jsonc`.
   - Crear un API token con permisos de Workers y D1.
   - Cargar `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` como secrets en GitHub.
2. En Google Cloud Console: crear el OAuth Client (orígenes y callback del §4) y cargar los secretos con `wrangler secret put`.
3. **Eliminar el proyecto Firebase `adra-54655`**, cuyas claves siguen en el historial de git y quedarán inutilizadas.
