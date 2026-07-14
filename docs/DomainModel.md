# DomainModel.md

> **Proyecto:** Expense Sharing Platform  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define los conceptos del negocio, sus relaciones e invariantes. El dominio es independiente de Firebase, Firestore, Android, Angular, API, JSON y bases de datos.

## Modelo general

```text
User -- Membership -- Group
                       ├── Expense -- Split
                       │             └── Attachment
                       ├── Settlement
                       ├── Balance
                       └── AuditLog
```

## Entidades

### User

Persona registrada. Propiedades: `Id`, `DisplayName`, `Email`, `PhotoUrl`, `PreferredCurrency`, `Language`, `TimeZone`, `CreatedAt`, `UpdatedAt`, `Status`. Puede participar en grupos, registrar gastos y realizar liquidaciones.

### Group

Conjunto que comparte gastos (`Id`, `Name`, `Description`, `Image`, `DefaultCurrency`, `CreatedBy`, fechas y `Status`). Administra miembros, gastos y liquidaciones. Es el agregado raíz.

### Membership

Relación usuario-grupo: `UserId`, `GroupId`, `Role`, `JoinedAt`, `Status`. Roles: `Owner`, `Administrator`, `Member`, `ReadOnly`.

### Expense

Pago registrado: `Id`, `GroupId`, `Title`, `Description`, `CategoryId`, `PaidBy`, `Currency`, `ExchangeRate`, `OriginalAmount`, `ConvertedAmount`, `ExpenseDate`, autor, fechas y estado. Conserva su información y tasa histórica.

### Split

Distribución: `ExpenseId`, `UserId`, `SplitType`, `Amount`, `Percentage`, `Shares`.

### Settlement

Transferencia que reduce deuda sin modificar gastos: `Id`, `GroupId`, `FromUser`, `ToUser`, `Amount`, `Currency`, `Status`, `CreatedAt`, `ConfirmedAt`.

### Balance

Posición regenerable por usuario y grupo: `GroupId`, `UserId`, `Paid`, `Consumed`, `Balance`, `UpdatedAt`. No es fuente de verdad permanente.

### Otros

- `Category`: `Id`, `Name`, `Color`, `Icon`, `Order`.
- `Attachment`: `Id`, `ExpenseId`, archivo, MIME, ruta de Storage y datos de carga.
- `AuditLog`: identidad, entidad, operación, valor anterior/nuevo, usuario y fecha. Nunca se borra.

## Value objects

- `Money`: `Amount`, `Currency`.
- `Currency`: código ISO, símbolo y decimales.
- `ExchangeRate`: origen, destino, tasa, captura y proveedor; queda inmutable después de usarse.
- `Percentage` (0 a 100), `Email`, `UserId`, `GroupId`, `ExpenseId`.

## Servicios de dominio

- `BalanceCalculator`: recalcular y validar balances.
- `DebtOptimizer`: minimizar pagos, eliminar ciclos y sugerir transferencias.
- `CurrencyConverter`: convertir y congelar tasas.
- `SettlementGenerator`: construir liquidaciones óptimas.
- `CalculationEngine`: resuelve estrategias versionadas de reparto, balance, moneda, redondeo y liquidación.

## Perfiles de cálculo

`CalculationProfile` es un perfil versionado con `Id`, `Name`, versión, estrategias de reparto, liquidación, moneda, balance y redondeo. Un grupo referencia el perfil activo. Todo gasto conserva la versión aplicada al crearse para garantizar reproducibilidad.

## Agregado e invariantes

`Group` es el agregado raíz y contiene miembros, gastos, liquidaciones y balances. Las modificaciones respetan sus reglas.

- Debe existir al menos un `Owner` activo.
- Todo gasto pertenece a un grupo y tiene un solo pagador.
- Todo participante del reparto pertenece al grupo.
- Los splits suman el total del gasto.
- Una liquidación no excede deuda válida ni se hace a sí mismo.
- Las tasas usadas no cambian.
- Un balance debe poder regenerarse únicamente desde gastos, splits y liquidaciones.

## Eventos de dominio

`GroupCreated`, `GroupArchived`, `MemberInvited`, `MemberRemoved`, `ExpenseCreated`, `ExpenseUpdated`, `ExpenseDeleted`, `ExpenseRestored`, `SettlementCreated`, `SettlementConfirmed`, `SettlementCancelled`, `BalanceRecalculated`, `CategoryCreated` y `ExchangeRateCaptured`.
