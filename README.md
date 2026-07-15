# 4adra — Cuentas claras, gastos compartidos

Plataforma para administrar gastos compartidos entre personas (grupos, balances, liquidaciones, múltiples monedas), inspirada en Settle Up y Splitwise. Backend único en Firebase, clientes Android y Web.

## Estado actual

- **Backend** (`backend/`): scaffold real de Fase 0 completo — Clean Architecture (domain/application/infrastructure/presentation), `GET /v1/me` funcionando de punta a punta, 51 tests unitarios + integración (Firebase Emulator) + contrato (OpenAPI).
- **Web** (`web/`) y **Android** (`android/`): todavía sin scaffolding real (solo `README.md` de cada carpeta describiendo la estructura prevista).
- **Documentación** (`docs/`): completa — arquitectura, modelo de dominio, reglas de negocio, algoritmos, seguridad, API, UI, roadmap y decisiones (ADRs).

No inventes comandos que no existan todavía en `web/`/`android/` — revisa `docs/checklists/Fase0-FundacionTecnica.md` para el estado real pieza por pieza.

## Documento maestro

**`docs/AGENTS.md`** define arquitectura oficial, stack, patrones requeridos y convenciones. Léelo antes de tocar código. Mapa completo de la documentación en `CLAUDE.md`.

## Arquitectura

```text
Android / Web (Presentation, MVVM)
     | HTTPS
Firebase Cloud Functions: Presentation -> Application -> Domain <- Infrastructure -> Firestore/Storage/Auth/Messaging
```

Clean Architecture + DDD Lite. El dominio no conoce Firebase, HTTP ni frameworks. Detalle completo en `docs/Architecture.md`.

## Stack

- **Backend:** TypeScript estricto, Node.js 24, Express, Firebase Cloud Functions (Admin SDK) + Firestore + Auth + Storage, Jest (unitarias, integración con Emulator Suite, contrato contra OpenAPI).
- **Web:** Angular + Angular Material + RxJS (planeado, sin scaffolding aún).
- **Android:** Kotlin + Jetpack Compose + MVVM + Hilt + Coroutines/Flow (planeado, sin scaffolding aún).

## Quick start (backend)

```bash
cd backend
npm ci
npm test                 # unitarias, 100% cobertura domain/application
npm run lint
npm run typecheck
npm run build

# Pruebas de integración (requieren Firebase Emulator Suite):
cd ..
firebase emulators:exec --project demo-4adra --only auth,firestore,storage \
  "npm --prefix backend run test:integration"

# Pruebas de contrato contra docs/api/openapi.yaml:
npm --prefix backend run test:contract
```

## Flujo de ramas (Git Flow)

`main` (producción) ← `release/*`/`hotfix/*` ← `develop` (integración) ← `feature/*`. Nunca se pushea directo a `main`/`develop` — todo vía Pull Request, con branch protection activa. Detalle completo y comandos de ejemplo en **[docs/Workflows.md](docs/Workflows.md)**; decisión registrada en ADR-013 (`docs/Decisions.md`).

## CI/CD

GitHub Actions corre lint/tipos/tests/build en cada PR y push a `main`/`develop`; el deploy real a Firebase solo se dispara con push a `main`. Ver `docs/Workflows.md` para el detalle de cada workflow.

## Documentación completa

| Documento | Contenido |
|---|---|
| `docs/AGENTS.md` | Reglas maestras y arquitectura oficial |
| `docs/Architecture.md`, `DomainModel.md`, `DatabaseSchema.md`, `ApiSpecification.md` | Diseño técnico |
| `docs/BusinessRules.md`, `Algorithms.md` | Reglas financieras y algoritmos determinísticos |
| `docs/Security.md`, `Deployment.md` | Controles de seguridad y proceso de despliegue |
| `docs/CodingStandards.md`, `TestingGuide.md`, `DevelopmentGuide.md` | Convenciones, estrategia de pruebas, guía de contribución |
| `docs/Roadmap.md`, `Decisions.md`, `Glossary.md` | Evolución, ADRs, lenguaje ubicuo |
| `docs/UISpecification.md` | Inventario de pantallas y navegación |
| `docs/Workflows.md` | Guía de los workflows de GitHub Actions con comandos de ejemplo |
| `docs/api/*.md` | Contrato HTTP detallado por recurso |
| `docs/checklists/Fase0-FundacionTecnica.md` | Checklist accionable de la fase actual |

## Reglas no negociables (resumen)

- Dinero siempre en decimal de precisión arbitraria — nunca `float`/`double`.
- `Balance = Pagado - Consumido`; `Σ Balance = 0` en todo grupo. Balances son proyecciones regenerables, nunca editadas a mano.
- Todo es soft delete (`ACTIVE`, `ARCHIVED`, `DELETED`) — nunca borrado físico de auditoría ni liquidaciones confirmadas.
- Android y Web nunca acceden a Firestore/Storage directamente — todo pasa por la API (Cloud Functions).

Detalle completo en `docs/BusinessRules.md` y `docs/DomainModel.md`.
