# Architecture.md

> **Proyecto:** Expense Sharing Platform  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Describe la arquitectura oficial, responsabilidades de capas, comunicación entre componentes y reglas que deben respetar desarrolladores y agentes. Busca escalabilidad, bajo acoplamiento, alta cohesión, facilidad de pruebas, independencia del framework y reutilización de lógica.

## Arquitectura general

Se usa Clean Architecture: el negocio se aísla de la infraestructura.

```text
Android / Web
     |
Presentation (MVVM UI)
     |
HTTPS
     |
Firebase Cloud Functions: API -> Application -> Domain -> Repository interfaces
                                                        ^
                         Infrastructure -> Firestore / Storage / Auth / Messaging
```

Las dependencias siempre apuntan hacia el dominio. El dominio no conoce Firebase, Firestore, Angular, Android, HTTP, JSON ni la base de datos.

## Capas

### Presentation

Pantallas, navegación, componentes, estado visual y validaciones simples. No contiene reglas de negocio, cálculos financieros ni acceso directo a Firestore.

### Application

Orquesta un caso de uso por operación (`CreateExpenseUseCase`, `UpdateExpenseUseCase`, `GenerateSettlementUseCase`, `InviteMemberUseCase`). Coordina transacciones, permisos, entidades y eventos; usa interfaces de repositorio, no Firestore.

### Domain

Núcleo libre de frameworks: entidades, value objects, servicios de dominio y algoritmos. Incluye `Expense`, `Group`, `Settlement`, `Money`, `Balance` y `DebtOptimizer`.

### Infrastructure

Adaptadores concretos como `FirestoreExpenseRepository`, `FirestoreGroupRepository`, `FirebaseAuthProvider`, almacenamiento y notificaciones. Se puede reemplazar sin modificar el dominio.

## Backend y clientes

Cada Cloud Function expone una operación y delega en un caso de uso:

```text
POST /expenses -> CreateExpenseFunction -> CreateExpenseUseCase -> ExpenseRepository -> Firestore
```

Los clientes siguen:

```text
View -> ViewModel -> API client -> Cloud Functions
```

Todos usan HTTPS. No acceden directamente a colecciones protegidas ni calculan balances.

## Flujos principales

### Crear gasto

```text
Formulario -> ViewModel -> Cloud Function -> validación/autorización
-> ExpenseFactory -> repositorio -> Firestore -> ExpenseCreated
-> recálculo de balances -> auditoría y notificaciones
```

### Liquidar

```text
Solicitud -> Cloud Function -> SettlementUseCase -> DebtOptimizer
-> SettlementRepository -> Firestore -> balance actualizado -> SettlementCreated
```

## Repositorios e inyección de dependencias

El dominio depende de interfaces (`ExpenseRepository`, `GroupRepository`, `MemberRepository`, `SettlementRepository`); infraestructura las implementa para Firestore. Todas las dependencias se inyectan; no hay instancias globales ni concretas dentro de casos de uso.

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

## Escalabilidad y extensibilidad

La solución debe soportar miles de grupos, millones de gastos, monedas y clientes múltiples. Nuevas capacidades —presupuestos, OCR, categorización con IA, integración bancaria, pagos, recordatorios y estadísticas— se agregan mediante casos de uso, estrategias y adaptadores, sin alterar el núcleo.

| Decisión | Motivo |
|---|---|
| Clean Architecture | Separación de responsabilidades |
| DDD Lite | Modelo de negocio sólido |
| Repository | Independencia de Firestore |
| Strategy | Repartos y liquidaciones extensibles |
| MVVM | Separación UI/presentación |
| Cloud Functions | Backend único |
| Event Driven | Auditoría, avisos y automatización |
