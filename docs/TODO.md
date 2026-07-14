# TODO.md — Estado de documentación

> **Proyecto:** 4adra  
> **Última actualización:** 2026-07-13 (ADR-008 a ADR-011, checklists de fases y especificación técnica ejecutable)

## Propósito

Lista de control de la documentación planificada. Al completar un archivo, quien lo complete debe marcarlo con `[x]`, actualizar la fecha y, si cambia el alcance, ajustar esta lista en el mismo cambio.

## Documentos principales

- [x] `AGENTS.md` — Reglas maestras, arquitectura y trabajo de agentes.
- [x] `Architecture.md` — Capas, componentes y flujos.
- [x] `DomainModel.md` — Entidades, agregados, invariantes y perfiles de cálculo.
- [x] `DatabaseSchema.md` — Esquema lógico de Firestore y colecciones.
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
- [x] `examples/FirestoreStructure.json`

## Checklists de fases (`checklists/`)

- [x] `checklists/README.md` — índice y cómo mantenerlos.
- [x] `checklists/Fase0-FundacionTecnica.md`
- [x] `checklists/Fase1-MVP.md`
- [x] `checklists/Fase2-MotorConfigurable.md`
- [x] `checklists/Fase3-ColaboracionExperiencia.md`
- [x] `checklists/Fase4-ReportesAdministracion.md`
- [x] `checklists/Fase5-CapacidadesAvanzadas.md`

## Especificación técnica ejecutable (raíz del repositorio)

- [x] `firebase.json` — configuración de proyecto Firebase (Firestore, Storage, Functions, Hosting, Emulators).
- [x] `firestore.rules` — deniega el 100 % del acceso directo de clientes (ADR-009).
- [x] `storage.rules` — ídem para Storage.
- [x] `firestore.indexes.json` — índices compuestos de `DatabaseSchema.md`.
- [x] `.firebaserc.example` — plantilla de alias de proyecto por entorno (copiar a `.firebaserc`, ignorado por git).
- [x] `docs/api/openapi.yaml` — contrato HTTP machine-readable, espejo de `ApiSpecification.md`/`api/*.md`.
- [ ] `backend/README.md`, `web/README.md`, `android/README.md` — placeholders de estructura; pendiente el scaffolding real (Fase 0).

## Regla de mantenimiento

Un archivo solo se marca completo cuando tiene contenido revisable, consistente con los documentos principales y sin secciones estructurales pendientes. Si se crea un archivo adicional de documentación, debe añadirse aquí antes o en el mismo cambio.
