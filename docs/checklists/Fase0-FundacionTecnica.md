# Fase 0 — Fundación técnica

> Checklist operativo de `docs/Roadmap.md` Fase 0. Marca cada casilla al completarla. Si el alcance cambia, ajusta este archivo en el mismo cambio (regla de mantenimiento de `docs/TODO.md`).
>
> **2026-11-11:** la plataforma se migró de Firebase a Cloudflare (ADR-014..017; spec `docs/superpowers/specs/2026-11-11-migracion-cloudflare-design.md`). Las tareas de Firebase y Android de la versión anterior de este checklist se retiraron; quedan en el historial de git.

## Objetivo

Disponer de una base segura y repetible para desarrollo:
- Repositorio, entornos y CI.
- Cloudflare Worker con D1 y Better Auth.
- Clean Architecture escaleteada, inyección de dependencias, manejo de errores y auditoría base.

## Prerrequisitos

- [x] Documentación de dominio y arquitectura completa (`docs/AGENTS.md`, `docs/Architecture.md`, `docs/DomainModel.md`, `docs/DatabaseSchema.md`, `docs/BusinessRules.md`, `docs/Algorithms.md`, `docs/Security.md`).
- [x] Decisiones de stack registradas en `docs/Decisions.md`: ADR-008 (criterios vigentes), ADR-011 (límites operativos), ADR-014 (Workers), ADR-015 (D1), ADR-016 (Better Auth), ADR-017 (solo PWA).
- [x] Contrato HTTP machine-readable: `docs/api/openapi.yaml` (servers `4adra.edier.me` y `localhost:8787`, `cookieAuth`).

## Checklist

### Repositorio y entornos

- [x] GitHub + GitHub Actions, carpetas independientes sin herramienta de monorepo, npm con lockfile (ADR-008).
- [x] Repositorio remoto: `https://github.com/ediervillaneda/4adra`.
- [x] `backend/.nvmrc`: Node 24 (tooling local y CI; el runtime es `workerd`).
- [ ] `web/.nvmrc`: confirmar la LTS activa al crear el scaffolding de `web/` (subproyecto 2).
- [x] Plantilla de secretos locales sin valores: `backend/.dev.vars.example` (`.dev.vars` ignorado por git).
- [ ] Cuando se cree `web/package.json`, definir los scripts que `web.yml` ya asume: `lint`, `test` (headless), `build`.

### Cloudflare (acciones manuales, `docs/Deployment.md` § "Configuración inicial")

- [x] `npx wrangler login` y verificar con `npx wrangler whoami`.
- [x] Confirmar que la zona `edier.me` está en la cuenta de Cloudflare.
- [x] `npx wrangler d1 create 4adra-db`, copiar el `database_id` a `backend/wrangler.jsonc` y ejecutar `npm run db:migrate:remote`.
- [x] Cliente OAuth de Google en el proyecto de Google Cloud `4adra-app` (ID `adra-app`), app en modo prueba con usuarios de prueba (orígenes `https://4adra.edier.me` y `http://localhost:8787`; callback `/api/auth/callback/google`).
- [x] `wrangler secret put` de `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
- [x] API token de Cloudflare (Workers + D1 Edit, alcance mínimo) y secrets de GitHub `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`.
- [x] Secrets de GitHub heredados de Firebase: verificado el 2026-11-11 que el repositorio ya no tiene ninguno.
- [ ] Eliminar el proyecto Firebase `adra-54655` (y `-staging`/`-prod`, si existen). Sus claves de cliente siguen en el historial de git.

### Backend (`backend/`)

- [x] Proyecto TypeScript con `strict: true` (`docs/CodingStandards.md`).
- [x] Estructura `backend/src/{domain,application,infrastructure,presentation}` y entrada del Worker `src/index.ts`.
- [x] ESLint + Prettier.
- [x] Vitest: unitarias (Node), integración (`@cloudflare/vitest-plugin`, runtime de Workers + D1 local) y contrato (OpenAPI + ajv).
- [x] `wrangler.jsonc`: Worker `4adra`, binding D1 `DB`, Static Assets (`run_worker_first: ["/api/*"]`) y ruta `4adra.edier.me`.
- [x] Migración inicial `migrations/0001_init.sql`: tablas de Better Auth, `users` y `audit_logs` inmutable (triggers).
- [x] Hono con `requestId`, `authenticate` (cookie → `SessionCredential`), `auditTrail` (`ctx.waitUntil`), `handleError` y 404 JSON.
- [x] Better Auth con Google (`createAuth`, `BetterAuthAuthenticationProvider`) e IDs UUID v7.
- [x] Primer caso de uso de punta a punta: `GET /api/v1/me` (perfil creado en el primer acceso), probado con una sesión real en la integración.
- [x] Composición manual de dependencias en `presentation/compositionRoot.ts`, sin instancias concretas dentro de los casos de uso.
- [x] Manejo de errores: excepciones de dominio traducidas a HTTP solo en Presentation, con el sobre de `docs/ApiSpecification.md`; los errores inesperados no filtran detalles.
- [x] Auditoría base desde un middleware común.
- [x] Prueba de humo local con `wrangler dev`: `/` → placeholder, `/api/v1/me` → 401 JSON, `/api/nope` → 404 JSON.

### Web (`web/`): subproyecto 2 (spec propio)

- [ ] Inicializar la PWA Angular con Angular Material y RxJS (manifest + service worker).
- [ ] ESLint (Angular) y estructura por funcionalidad.
- [ ] Cliente HTTP tipado con rutas relativas `/api/v1`, contra `docs/api/openapi.yaml`.
- [ ] Login "Continuar con Google" (cliente de Better Auth) y pantalla de perfil (`GET /api/v1/me`).
- [ ] Apuntar `assets.directory` de `backend/wrangler.jsonc` al build de la PWA.

### CI/CD

- [x] `backend.yml`: formato, lint, tipos, unitarias + cobertura, migraciones D1 en limpio, integración, contrato, `npm audit` y build (`wrangler deploy --dry-run`).
- [x] `deploy-cloudflare.yml`: migraciones D1 remotas + `wrangler deploy` con push a `main`; se omite si faltan los secrets.
- [x] `release.yml` sin Android; `openapi-lint.yml` vigente.
- [x] Primer deploy real a `https://4adra.edier.me` (2026-11-11, manual con `wrangler deploy`, versión `a40dfda1`). Prueba de humo: `/` 200, `/api/v1/me` 401 JSON, `/api/nope` 404 JSON, `sign-in/social` devuelve la URL de Google.

### Documentación

- [x] ADR-014..017 registrados; ADR-002, 003, 008 (parcial), 009, 010 y 012 marcados como reemplazados.
- [x] `CLAUDE.md`, `AGENTS.md` y `README.md` con los comandos reales.
- [x] Decisiones del aprovisionamiento: Cloudflare aceptó el nombre `4adra`; el proyecto de Google Cloud se llama `4adra-app` para no confundirlo con el proyecto Firebase `adra-54655` (que se llama "4adra" en la consola).
- [ ] Pasar la app de Google de "Prueba" a "En producción" cuando se quiera abrir a cualquier cuenta de Google.

## Criterios de salida

- [ ] Backend y PWA pueden autenticarse con Google en local y en producción.
- [x] El pipeline de CI ejecuta formato, tipos, pruebas, migraciones e integración en verde para `backend/`.
- [x] D1 solo es accesible vía el binding del Worker (no existe acceso directo desde clientes).
- [x] Existe al menos un caso de uso de punta a punta funcionando (`GET /api/v1/me`) como prueba de arquitectura.

## Documentos relacionados

`docs/Roadmap.md` (Fase 0), `docs/Decisions.md` (ADR-008, ADR-011, ADR-014 a ADR-017), `docs/DevelopmentGuide.md`, `docs/CodingStandards.md`, `docs/TestingGuide.md`, `docs/Deployment.md`, `docs/Security.md`, `backend/wrangler.jsonc`, `backend/migrations/`, `docs/api/openapi.yaml`.
