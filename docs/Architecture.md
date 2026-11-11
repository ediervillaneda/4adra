# Architecture.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Describe la arquitectura oficial, responsabilidades de capas, comunicación entre componentes y reglas que deben respetar desarrolladores y agentes. Busca escalabilidad, bajo acoplamiento, alta cohesión, facilidad de pruebas, independencia del framework y reutilización de lógica.

## Arquitectura general

Se usa Clean Architecture: el negocio se aísla de la infraestructura.

```text
PWA (Angular, PC y celular)
     |
Presentation (MVVM UI)
     |
HTTPS, mismo origen: https://4adra.edier.me
     |
Cloudflare Worker "4adra"
 ├─ /api/v1/*   Hono: API -> Application -> Domain -> Repository interfaces
 │                                                      ^
 │              Infrastructure -> D1 (D1*Repository) / Better Auth / (R2, Web Push, Cron)
 ├─ /api/auth/* Better Auth (Google OAuth, sesiones en D1)
 └─ /*          Workers Static Assets (build de la PWA)
```

Las dependencias siempre apuntan hacia el dominio. El dominio no conoce Cloudflare, D1, Hono, Better Auth, Angular, HTTP, JSON ni la base de datos.

## Capas

### Presentation

Pantallas, navegación, componentes, estado visual y validaciones simples. No contiene reglas de negocio, cálculos financieros ni acceso directo a la base de datos.

### Application

Orquesta un caso de uso por operación (`CreateExpenseUseCase`, `UpdateExpenseUseCase`, `GenerateSettlementUseCase`, `InviteMemberUseCase`). Coordina transacciones, permisos, entidades y eventos; usa interfaces de repositorio, nunca D1 directamente.

### Domain

Núcleo libre de frameworks: entidades, value objects, servicios de dominio y algoritmos. Incluye `Expense`, `Group`, `Settlement`, `Money`, `Balance` y `DebtOptimizer`.

### Infrastructure

Adaptadores concretos como `D1UserRepository`, `D1AuditLogWriter`, `D1ExpenseRepository` (previsto), `BetterAuthAuthenticationProvider`, almacenamiento (R2) y notificaciones (Web Push). Se puede reemplazar sin modificar el dominio.

## Backend y clientes

Un único Worker atiende todas las rutas. Cada ruta Hono es un handler delgado que delega en un caso de uso; `presentation/compositionRoot.ts` es el único lugar que instancia adaptadores concretos a partir de los bindings (`env.DB`, secretos):

```text
POST /api/v1/groups/{groupId}/expenses -> createExpenseHandler -> CreateExpenseUseCase -> ExpenseRepository -> D1
```

El trabajo que no debe retrasar la respuesta (auditoría, notificaciones) se agenda con `ctx.waitUntil`.

Los clientes siguen:

```text
View -> ViewModel -> API client -> /api/v1 (mismo origen)
```

Todos usan HTTPS. No acceden a D1 ni a R2 (solo el Worker tiene esos bindings) ni calculan balances.

## Flujos principales

### Crear gasto

```text
Formulario -> ViewModel -> Worker (/api/v1) -> validación/autorización
-> ExpenseFactory -> repositorio -> D1 (db.batch: gasto + splits) -> ExpenseCreated
-> recálculo de balances -> auditoría y notificaciones
```

### Liquidar

```text
Solicitud -> Worker (/api/v1) -> SettlementUseCase -> DebtOptimizer
-> SettlementRepository -> D1 -> balance actualizado -> SettlementCreated
```

## Repositorios e inyección de dependencias

El dominio depende de interfaces (`ExpenseRepository`, `GroupRepository`, `MemberRepository`, `SettlementRepository`); infraestructura las implementa para D1. Todas las dependencias se inyectan; no hay instancias globales ni concretas dentro de casos de uso.

## Estrategias y motor de cálculo

Los repartos usan `SplitStrategy`: `EqualSplitStrategy`, `PercentageSplitStrategy`, `ExactAmountStrategy`, `SharesStrategy` y `CustomStrategy`.

El motor de cálculo desacoplado puede elegir estrategias de liquidación por perfil: `Greedy`, `MinimumTransactions`, `MinimumMoneyMoved`, `PriorityBased`, `RoundRobin` o una extensión registrada. Cada grupo referencia un perfil versionado; cada gasto conserva la versión usada, para reproducción histórica.

```text
CalculationEngine
├── SplitStrategy
├── BalanceStrategy
├── SettlementStrategy
├── CurrencyStrategy
├── RoundingStrategy
└── ValidationStrategy
```

## Eventos, errores y auditoría

Eventos como `ExpenseCreated`, `ExpenseUpdated`, `ExpenseDeleted`, `SettlementCreated`, `SettlementConfirmed`, `MemberInvited` y `BalanceRecalculated` habilitan notificaciones, auditoría y automatización.

Usar errores específicos: `GroupNotFoundException`, `ExpenseNotFoundException`, `PermissionDeniedException`, `CurrencyMismatchException` e `InvalidSplitException`; nunca excepciones genéricas para errores de dominio.

Cada modificación guarda usuario, fecha, operación, datos anteriores y posteriores, origen y dispositivo.

## Plataforma Cloudflare y equivalencias

| Necesidad | Servicio | Estado |
|---|---|---|
| API y hosting de la PWA | Worker `4adra` + Static Assets | En uso |
| Persistencia relacional | D1 `4adra-db` (binding `DB`), ADR-015 | En uso |
| Identidad y sesiones | Better Auth (Google) dentro del Worker, ADR-016 | En uso |
| Adjuntos y avatares | R2 (binding del Worker; el cliente nunca accede directo) | Fase que implemente adjuntos |
| Notificaciones push | Web Push estándar (VAPID) enviado desde el Worker | Fase 3 |
| Tareas programadas | Cron Triggers del Worker | Cuando exista un job programado |
| Pruebas locales | `wrangler dev` / Miniflare + `@cloudflare/vitest-plugin` | En uso |

## Escalabilidad y extensibilidad

La solución debe soportar miles de grupos, millones de gastos, monedas y clientes múltiples. Nuevas capacidades —presupuestos, OCR, categorización con IA, integración bancaria, pagos, recordatorios y estadísticas— se agregan mediante casos de uso, estrategias y adaptadores, sin alterar el núcleo.

| Decisión | Motivo |
|---|---|
| Clean Architecture | Separación de responsabilidades |
| DDD Lite | Modelo de negocio sólido |
| Repository | Independencia de D1 (migrable a PostgreSQL sin tocar el dominio) |
| Strategy | Repartos y liquidaciones extensibles |
| MVVM | Separación UI/presentación |
| Cloudflare Worker + Static Assets | Backend único y mismo origen que la PWA (ADR-014) |
| Event Driven | Auditoría, avisos y automatización |
