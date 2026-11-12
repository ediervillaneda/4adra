# 4adra — Cuentas claras, gastos compartidos

Plataforma para administrar gastos compartidos entre personas (grupos, balances, liquidaciones, múltiples monedas), inspirada en Settle Up y Splitwise.

- Todo corre en **Cloudflare**: un Worker con API + D1 + login con Google.
- Un único cliente: una **PWA** responsive para PC y celular.
- Producción en **https://4adra.edier.me**.

## Estado actual

- **Backend** (`backend/`): Cloudflare Worker `4adra` con Clean Architecture (domain/application/infrastructure/presentation).
  - Stack: Hono + D1 + Better Auth (Google).
  - `GET /api/v1/me` funciona de punta a punta.
  - Pruebas: unitarias, de integración (runtime de Workers + D1 local) y de contrato (OpenAPI).
- **Web** (`web/`): PWA en Angular 22 con login con Google, aviso de invitación, perfil editable y política de privacidad. Se instala en el celular y abre sin conexión. La sirve el mismo Worker.
- **Android**: descartado (ADR-017). La PWA se instala en el celular desde el navegador.
- **Documentación** (`docs/`): completa. Cubre arquitectura, modelo de dominio, reglas de negocio, algoritmos, seguridad, API, UI, roadmap y decisiones (ADRs).

Revisa `docs/checklists/Fase0-FundacionTecnica.md` para el estado real pieza por pieza.

## Documento maestro

**`docs/AGENTS.md`** define arquitectura oficial, stack, patrones requeridos y convenciones. Léelo antes de tocar código. Mapa completo de la documentación en `CLAUDE.md`.

## Arquitectura

```text
https://4adra.edier.me
 └─ Cloudflare Worker "4adra"
     ├─ /api/v1/*   → Hono (Presentation) → Application → Domain ← Infrastructure → D1
     ├─ /api/auth/* → Better Auth (Google OAuth, sesiones en D1)
     └─ /*          → Workers Static Assets (PWA)
```

Clean Architecture + DDD Lite. El dominio no conoce Cloudflare, HTTP ni frameworks. Detalle completo en `docs/Architecture.md`.

## Stack

- **Backend:**
  - TypeScript estricto sobre Cloudflare Workers (Wrangler), Hono, Cloudflare D1 (SQLite) y Better Auth (Google OAuth).
  - Pruebas con Vitest + `@cloudflare/vitest-plugin`.
- **Web:** PWA con Angular 22 + Angular Material 3 + `@angular/service-worker`, servida por el mismo Worker. Pruebas con Vitest.

## Quick start (backend)

```bash
cd backend
npm ci
cp .dev.vars.example .dev.vars   # completa BETTER_AUTH_SECRET (y Google para login real)
npm run db:migrate:local         # crea la D1 local
npm run dev                      # http://localhost:8787

npm test                         # unitarias + cobertura
npm run test:integration         # runtime de Workers + D1 local
npm run test:contract            # contra docs/api/openapi.yaml
npm run lint && npm run typecheck
npm run build                    # wrangler deploy --dry-run
```

## Quick start (web)

```bash
cd web
npm ci
npm start                        # http://localhost:4200 (proxy de /api → backend en :8787)
npm test && npm run lint
npm run build                    # web/dist/web/browser → assets del Worker
```

Para el login con Google en `localhost:4200`, el backend necesita `TRUSTED_ORIGINS=http://localhost:4200` en `backend/.dev.vars`.

## Flujo de ramas (Git Flow)

`main` (producción) ← `release/*`/`hotfix/*` ← `develop` (integración) ← `feature/*`. Nunca se pushea directo a `main`/`develop`: todo va por Pull Request, con branch protection activa. Detalle completo y comandos de ejemplo en **[docs/Workflows.md](docs/Workflows.md)**; la decisión está registrada en ADR-013 (`docs/Decisions.md`).

## CI/CD

GitHub Actions corre formato, lint, tipos, pruebas, migraciones y build en cada PR y en cada push a `main`/`develop`.

El deploy real a Cloudflare (migraciones D1 + `wrangler deploy`) solo se dispara con push a `main` (`deploy-cloudflare.yml`). Cada versión se registra en **[CHANGELOG.md](CHANGELOG.md)**; al pushear su tag `v<versión>`, `release.yml` crea el GitHub Release. Pasos manuales de la primera vez: `docs/Deployment.md`.

## Documentación completa

| Documento | Contenido |
|---|---|
| `docs/AGENTS.md` | Reglas maestras y arquitectura oficial |
| `docs/Architecture.md`, `DomainModel.md`, `DatabaseSchema.md`, `ApiSpecification.md` | Diseño técnico |
| `docs/BusinessRules.md`, `Algorithms.md` | Reglas financieras y algoritmos determinísticos |
| `docs/Security.md`, `Deployment.md` | Controles de seguridad y proceso de despliegue |
| `docs/CodingStandards.md`, `TestingGuide.md`, `DevelopmentGuide.md` | Convenciones, estrategia de pruebas, guía de contribución |
| `docs/Roadmap.md`, `Decisions.md`, `Glossary.md` | Evolución, ADRs, lenguaje ubicuo |
| `docs/UISpecification.md` | Inventario de pantallas y navegación de la PWA |
| `docs/Workflows.md` | Guía de los workflows de GitHub Actions con comandos de ejemplo |
| `docs/api/*.md` | Contrato HTTP detallado por recurso |
| `docs/checklists/Fase0-FundacionTecnica.md` | Checklist accionable de la fase actual |

## Reglas no negociables (resumen)

- Dinero siempre en decimal de precisión arbitraria, nunca `float`/`double`. En D1 se guarda como `TEXT`, nunca `REAL`.
- `Balance = Pagado - Consumido`; `Σ Balance = 0` en todo grupo. Los balances son proyecciones regenerables y nunca se editan a mano.
- Todo es soft delete (`ACTIVE`, `ARCHIVED`, `DELETED`). Nunca se borran físicamente la auditoría ni las liquidaciones confirmadas.
- La PWA nunca accede a D1 ni a R2: todo pasa por la API del Worker.

Detalle completo en `docs/BusinessRules.md` y `docs/DomainModel.md`.
