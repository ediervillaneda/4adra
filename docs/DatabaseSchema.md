# DatabaseSchema.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Base de datos:** Firebase Firestore  
> **Estado:** Draft

## Objetivo y principios

Define el esquema lógico de Firestore. Evitar duplicación innecesaria, optimizar lecturas frecuentes, usar índices, evitar documentos mayores de 1 MB, minimizar escrituras y preservar consistencia eventual. Cambios deben documentarse aquí.

## Colecciones

```text
users/                groups/               groupMembers/
expenses/             expenseSplits/        settlements/
balances/             categories/           exchangeRates/
calculationProfiles/  notifications/         auditLogs/
appSettings/
```

### `users/{userId}`

```json
{"displayName":"Juan Pérez","email":"juan@example.com","photoUrl":"","preferredCurrency":"USD","language":"es","timeZone":"America/Bogota","createdAt":"Timestamp","updatedAt":"Timestamp","status":"ACTIVE"}
```

### `groups/{groupId}`

```json
{"name":"Viaje Guatemala","description":"Vacaciones 2027","image":"","defaultCurrency":"USD","ownerId":"userId","calculationProfileId":"profileId","calculationProfileVersion":1,"createdAt":"Timestamp","updatedAt":"Timestamp","status":"ACTIVE"}
```

### `groupMembers/{membershipId}`

```json
{"groupId":"groupId","userId":"userId","role":"OWNER","joinedAt":"Timestamp","status":"ACTIVE"}
```

### `expenses/{expenseId}`

```json
{"groupId":"groupId","title":"Hotel","description":"","categoryId":"categoryId","paidBy":"userId","currency":"USD","exchangeRate":1,"originalAmount":500,"convertedAmount":500,"calculationProfileVersion":1,"expenseDate":"Timestamp","createdBy":"userId","createdAt":"Timestamp","updatedAt":"Timestamp","status":"ACTIVE"}
```

### `expenseSplits/{splitId}`

```json
{"expenseId":"expenseId","groupId":"groupId","userId":"userId","splitType":"EQUAL","amount":125,"percentage":25,"shares":1}
```

### `settlements/{settlementId}`

```json
{"groupId":"groupId","fromUser":"userId","toUser":"userId","currency":"USD","amount":50,"status":"PENDING","createdAt":"Timestamp","confirmedAt":null}
```

### `balances/{balanceId}`

```json
{"groupId":"groupId","userId":"userId","paid":850,"consumed":600,"balance":250,"updatedAt":"Timestamp"}
```

Balances son materializados y regenerables; no se editan manualmente.

### Catálogos y soporte

- `categories/{id}`: nombre, icono, color y orden.
- `exchangeRates/{id}`: `from`, `to`, `rate`, proveedor y captura; una tasa usada no cambia.
- `calculationProfiles/{id}`: nombre, versión y nombres de estrategias (`split`, `settlement`, `rounding`, `currency`, `balance`). Las versiones son inmutables.
- `notifications/{id}`: usuario, título, mensaje, lectura y fecha.
- `auditLogs/{id}`: entidad, entidad ID, operación, usuario, valor anterior/nuevo, fecha.
- `appSettings/{id}`: monedas, regionalización, límites y versiones mínimas.

## Índices recomendados

- `expenses`: `groupId + expenseDate`, `groupId + categoryId`, `groupId + paidBy`, `groupId + status`.
- `settlements`: `groupId + status`, `fromUser + status`, `toUser + status`.
- `balances`: `groupId + userId`.
- `groupMembers`: `groupId + userId`, `userId + status`.

## Convenciones

- IDs UUID v7 o automáticos de Firestore; nunca incrementales.
- Fechas como `Timestamp`, nunca texto.
- Monedas ISO-4217: `USD`, `COP`, `EUR`, `MXN`, `GTQ`.
- Soft delete con estados `ACTIVE`, `ARCHIVED`, `DELETED`.
- Auditoría, liquidaciones confirmadas y tasas históricas no se eliminan.

## Denormalización y migraciones

Solo denormalizar para reducir lecturas de manera significativa y con sincronización clara (por ejemplo, nombre de grupo en una notificación). Los datos financieros no se duplican como fuente de verdad.

Toda migración mantiene compatibilidad cuando sea posible, se registra en `Decisions.md`, incluye scripts si afecta datos y actualiza este documento.
