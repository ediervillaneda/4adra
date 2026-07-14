# AGENTS.md

> **Proyecto:** Expense Sharing Platform  
> **Versión:** 1.0  
> **Estado:** Draft  
> **Arquitectura:** Clean Architecture + DDD Lite + MVVM + Firebase Backend + Event Driven

## Objetivo del proyecto

Desarrollar una plataforma moderna para administrar gastos compartidos entre personas, inspirada en Settle Up y Splitwise. Permitirá registrar gastos, administrar grupos, calcular balances, optimizar liquidaciones, manejar múltiples monedas y sincronizar información entre Android y Web mediante una API única.

## Objetivo de este documento

Este documento define las reglas oficiales del proyecto. Todo desarrollador o agente de IA debe seguirlas antes de modificar el sistema. Tiene prioridad sobre el resto de la documentación.

## Filosofía y principios

- Priorizar claridad, legibilidad, mantenibilidad, simplicidad y reutilización.
- Evitar la optimización prematura y la duplicación de lógica.
- Toda información debe ser persistente, auditable y determinística.
- No eliminar información financiera física: usar *soft delete* cuando corresponda.
- Mantener compatibilidad hacia atrás en los contratos públicos cuando sea posible.

### Una única fuente de verdad

El backend calcula balances, liquidaciones, permisos, tasas y auditoría. Android y Web solo presentan y solicitan operaciones; no implementan cálculos financieros ni reglas de negocio.

## Arquitectura oficial

```text
Presentation -> Application -> Domain <- Infrastructure -> Firebase
```

Las dependencias apuntan hacia el dominio. Ninguna capa puede saltarse la jerarquía.

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| Presentation | UI, navegación, estado visual y validaciones simples | Reglas de negocio y cálculos financieros |
| Application | Casos de uso, transacciones, autorización y eventos | Acceso directo a Firebase |
| Domain | Entidades, value objects, reglas y algoritmos | Frameworks, HTTP, JSON y Firebase |
| Infrastructure | Repositorios y adaptadores concretos | Decisiones de negocio |

## Stack oficial

- **Backend:** TypeScript, Node.js, Firebase Cloud Functions, Firestore, Auth, Storage, Cloud Messaging y Scheduler.
- **Android:** Kotlin, Jetpack Compose, MVVM, Hilt, Coroutines y Flow.
- **Web:** Angular, TypeScript, Angular Material y RxJS.
- **Testing:** Jest, JUnit, MockK y Firebase Emulator.

## Patrones requeridos

- Clean Architecture, Repository y Dependency Injection.
- Strategy para repartos y optimización de liquidaciones.
- Factory para entidades complejas y Builder para objetos extensos.
- Domain Events/Observer para auditoría, notificaciones y sincronización.

Nunca instanciar dependencias concretas dentro de un caso de uso ni acceder a Firestore directamente desde la lógica de dominio.

## Modelo oficial

Entidades permitidas: `User`, `Group`, `Member`/`Membership`, `Expense`, `Split`, `Balance`, `Settlement`, `Category`, `Currency`, `ExchangeRate`, `Attachment`, `Notification` y `AuditLog`.

Usar value objects para conceptos importantes: `Money`, `Percentage`, `CurrencyCode`, `Email`, `UserId`, `GroupId` y `ExpenseId`. Evitar primitivos para conceptos de dominio.

## Casos de uso

Cada caso de uso hace una sola tarea. Ejemplos: `CreateGroup`, `ArchiveGroup`, `InviteMember`, `CreateExpense`, `UpdateExpense`, `DeleteExpense`, `CalculateBalances`, `GenerateSettlements`, `ConfirmSettlement`, `ExportReport`, `ImportExpenses` y `GenerateDashboard`.

## Convenciones

- Usar nombres explícitos: `ExpenseRepository`, `ExpenseFactory`, `CreateExpenseUseCase`.
- Prohibidos nombres genéricos como `Manager`, `Helper`, `Util`, `Common` o `Misc`.
- Los métodos expresan acciones: `createExpense()`, `archiveGroup()`, `calculateBalances()`.
- Preferir `amount`, `user`, `group`, `participant`; no abreviaturas como `amt`, `usr`, `grp`.

## Firebase y seguridad

Firestore es persistencia, no lógica de negocio. Las operaciones críticas —crear o eliminar gastos, invitar usuarios, liquidar, cerrar grupos y recalcular balances— pasan por Cloud Functions.

Toda petición se autentica. Nunca confiar en datos de cliente; validar permisos, pertenencia al grupo, estados, monedas y participantes en el servidor.

## Eventos y auditoría

Eventos oficiales: `ExpenseCreated`, `ExpenseUpdated`, `ExpenseDeleted`, `SettlementCreated`, `SettlementConfirmed`, `SettlementRejected`, `MemberInvited`, `MemberRemoved`, `GroupArchived`, `BalanceRecalculated` y `ExchangeRateUpdated`.

Toda modificación debe registrar usuario, fecha, operación, valores anterior/nuevo y, cuando aplique, IP y dispositivo. La auditoría nunca se elimina.

## Testing y calidad

Cobertura mínima: Domain 100 %, Application 95 %, Infrastructure 80 % y Presentation 70 %.

Todo cambio debe compilar, conservar pruebas existentes, incluir pruebas nuevas, actualizar documentación, seguir convenciones y evitar código muerto o lógica duplicada.

## Reglas para agentes de IA

- Leer este documento antes de generar o cambiar código.
- Respetar la arquitectura y reutilizar componentes existentes.
- No modificar contratos públicos sin autorización.
- Crear pruebas y actualizar los documentos afectados.
- Preferir la alternativa más simple, mantenible y consistente.
- No introducir dependencias ni deuda técnica deliberadamente.

Las funcionalidades deben actualizar, cuando aplique: `Architecture.md`, `DomainModel.md`, `DatabaseSchema.md`, `ApiSpecification.md`, `BusinessRules.md`, `Algorithms.md`, `Security.md` y `Roadmap.md`.

## Objetivo final

Construir una plataforma escalable de referencia para gastos compartidos, capaz de soportar miles de usuarios y clientes Android, Web y futuros sin comprometer calidad ni consistencia de las reglas de negocio.
