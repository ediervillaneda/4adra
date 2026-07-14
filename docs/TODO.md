# TODO.md — Estado de documentación

> **Proyecto:** Expense Sharing Platform  
> **Última actualización:** 2026-07-13

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
- [ ] `api/Members.md` — Operaciones detalladas de membresías, roles e invitaciones.
- [ ] `api/Balances.md` — Balances, recálculo y sugerencias de liquidación.
- [ ] `api/Settlements.md` — Liquidaciones, confirmación y cancelación.
- [ ] `api/Reports.md` — Exportaciones y reportes.

## Documentación de dominio (`domain/`)

- [ ] `domain/Expense.md`
- [ ] `domain/Group.md`
- [ ] `domain/Member.md`
- [ ] `domain/Settlement.md`
- [ ] `domain/Balance.md`
- [ ] `domain/Money.md`
- [ ] `domain/Currency.md`
- [ ] `domain/Events.md`

## Diagramas (`diagrams/`)

- [ ] `diagrams/Architecture.drawio`
- [ ] `diagrams/Database.drawio`
- [ ] `diagrams/SequenceExpense.drawio`
- [ ] `diagrams/SequenceSettlement.drawio`
- [ ] `diagrams/ClassDiagram.drawio`

## Ejemplos (`examples/`)

- [ ] `examples/Expense.json`
- [ ] `examples/Group.json`
- [ ] `examples/Settlement.json`
- [ ] `examples/FirestoreStructure.json`

## Regla de mantenimiento

Un archivo solo se marca completo cuando tiene contenido revisable, consistente con los documentos principales y sin secciones estructurales pendientes. Si se crea un archivo adicional de documentación, debe añadirse aquí antes o en el mismo cambio.
