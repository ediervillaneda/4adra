# TODO.md — Estado de documentación

> **Proyecto:** 4adra  
> **Última actualización:** 2026-11-11 (migración a Cloudflare: ADR-014 a ADR-017)

## Propósito

Lista de control de la documentación planificada. Al completar un archivo, quien lo complete debe marcarlo con `[x]`, actualizar la fecha y, si cambia el alcance, ajustar esta lista en el mismo cambio.

## Documentos principales

- [x] `AGENTS.md` — Reglas maestras, arquitectura y trabajo de agentes.
- [x] `Architecture.md` — Capas, componentes y flujos.
- [x] `DomainModel.md` — Entidades, agregados, invariantes y perfiles de cálculo.
- [x] `DatabaseSchema.md` — Esquema relacional de D1 (tablas, índices, triggers, migraciones).
- [x] `BusinessRules.md` — Reglas funcionales y permisos.
- [x] `Algorithms.md` — Cálculos, estrategias y motor configurable.
- [x] `ApiSpecification.md` — Contrato HTTP general.
- [x] `Security.md` — Autenticación, autorización y controles.
- [x] `CodingStandards.md` — Convenciones de desarrollo.
- [x] `TestingGuide.md` — Estrategia de pruebas.
- [x] `DevelopmentGuide.md` — Guía de contribución.
- [x] `Deployment.md` — Entornos y despliegue.
- [x] `Roadmap.md` — Evolución planificada.
- [x] `Decisions.md` — Registro de decisiones (ADR).
- [x] `Glossary.md` — Lenguaje ubicuo.
- [x] `UISpecification.md` — Inventario de pantallas, navegación y reglas de presentación (PWA en celular y PC, todas las fases). No incluye wireframes visuales ni sistema de diseño de marca — ver "Pendiente fuera de este documento" dentro del archivo.

## Documentación de API (`api/`)

- [x] `api/Auth.md` — Autenticación, perfil y sesión.
- [x] `api/Groups.md` — Grupos, miembros y perfiles de cálculo.
- [x] `api/Expenses.md` — Gastos, repartos y adjuntos.
- [x] `api/Members.md` — Operaciones detalladas de membresías, roles e invitaciones.
- [x] `api/Balances.md` — Balances, recálculo y sugerencias de liquidación.
- [x] `api/Settlements.md` — Liquidaciones, confirmación y cancelación.
- [x] `api/Reports.md` — Exportaciones y reportes.

## Documentación de dominio (`domain/`)

- [x] `domain/Expense.md`
- [x] `domain/Group.md`
- [x] `domain/Member.md`
- [x] `domain/Settlement.md`
- [x] `domain/Balance.md`
- [x] `domain/Money.md`
- [x] `domain/Currency.md`
- [x] `domain/Events.md`

## Diagramas (`diagrams/`)

- [x] `diagrams/Architecture.drawio`
- [x] `diagrams/Database.drawio`
- [x] `diagrams/SequenceExpense.drawio`
- [x] `diagrams/SequenceSettlement.drawio`
- [x] `diagrams/ClassDiagram.drawio`

## Ejemplos (`examples/`)

- [x] `examples/Expense.json`
- [x] `examples/Group.json`
- [x] `examples/Settlement.json`
- [x] `examples/D1Schema.sql` — esquema D1 completo de referencia

## Checklists de fases (`checklists/`)

- [x] `checklists/README.md` — índice y cómo mantenerlos.
- [x] `checklists/Fase0-FundacionTecnica.md`
- [x] `checklists/Fase1-MVP.md`
- [x] `checklists/Fase2-MotorConfigurable.md`
- [x] `checklists/Fase3-ColaboracionExperiencia.md`
- [x] `checklists/Fase4-ReportesAdministracion.md`
- [x] `checklists/Fase5-CapacidadesAvanzadas.md`

## Especificación técnica ejecutable (raíz del repositorio)

- [x] `backend/wrangler.jsonc` — Worker `4adra`, binding D1 `DB`, Static Assets y ruta `4adra.edier.me` (ADR-014).
- [x] `backend/migrations/0001_init.sql` — Better Auth, `users` y `audit_logs` inmutable (ADR-015, ADR-016).
- [x] `backend/.dev.vars.example` — nombres de secretos locales, sin valores.
- [x] `docs/api/openapi.yaml` — contrato HTTP machine-readable, espejo de `ApiSpecification.md`/`api/*.md`.
- [x] `.github/workflows/backend.yml`, `web.yml` — CI por plataforma .
- [x] `.github/workflows/deploy-cloudflare.yml` — migraciones D1 + `wrangler deploy` con push a `main`.
- [x] `.github/workflows/release.yml` — GitHub Release al pushear el tag `v<versión>`, con notas de `CHANGELOG.md`. El lint de OpenAPI vive en `backend.yml`.
- [x] `backend/` — scaffold real de Fase 0 sobre Cloudflare (Hono + D1 + Better Auth), `GET /api/v1/me` de punta a punta.
- [x] `web/` — PWA base en Angular 22 (ADR-019).
- [ ] Pieza 2, grupos y miembros (rama `feature/grupos-y-miembros`): historia #1 (crear un grupo y verlo en Inicio) hecha y verificada en local; siguen ver miembros, invitaciones (en la app y por enlace, solo correos de la lista de acceso), roles, remover y salir, editar y archivar. Después vienen la pieza 3 (gastos y balances) y la pieza 4 (liquidaciones).

## Regla de mantenimiento

Un archivo solo se marca completo cuando tiene contenido revisable, consistente con los documentos principales y sin secciones estructurales pendientes. Si se crea un archivo adicional de documentación, debe añadirse aquí antes o en el mismo cambio.
