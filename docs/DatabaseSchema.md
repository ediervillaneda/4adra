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
invitations/          expenses/             expenseSplits/
settlements/          balances/             categories/
exchangeRates/        calculationProfiles/  notifications/
auditLogs/            appSettings/
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
{"groupId":"groupId","userId":"userId","role":"OWNER","status":"ACTIVE","invitedAt":"Timestamp","joinedAt":"Timestamp","updatedAt":"Timestamp"}
```

`membershipId` es determinista: `{groupId}_{userId}` (ADR-010). Permite `get()` directo para verificar membresía/rol sin consulta indexada, tanto en casos de uso del backend como en reglas de seguridad. Un usuario tiene como máximo una membresía vigente por grupo, por lo que la clave compuesta no pierde información.

### `invitations/{invitationId}`

```json
{"groupId":"groupId","email":"juan@example.com","role":"MEMBER","status":"PENDING","createdBy":"userId","createdAt":"Timestamp","expiresAt":"Timestamp"}
```

Colección a nivel raíz porque `POST /invitations/{invitationId}/accept|decline` se resuelve por identidad global, no anidada bajo el grupo. Una invitación aceptada o rechazada no se borra; conserva su estado final para auditoría.

### `expenses/{expenseId}`

```json
{"groupId":"groupId","title":"Hotel","description":"","categoryId":"categoryId","paidBy":"userId","currency":"USD","exchangeRate":"1.000000","originalAmount":"500.00","convertedAmount":"500.00","calculationProfileVersion":1,"expenseDate":"Timestamp","createdBy":"userId","createdAt":"Timestamp","updatedAt":"Timestamp","status":"ACTIVE"}
```

### `expenseSplits/{splitId}`

```json
{"expenseId":"expenseId","groupId":"groupId","userId":"userId","splitType":"EQUAL","amount":"125.00","percentage":"25","shares":1}
```

### `settlements/{settlementId}`

```json
{"groupId":"groupId","fromUser":"userId","toUser":"userId","currency":"USD","amount":"50.00","status":"PENDING","createdAt":"Timestamp","confirmedAt":null}
```

### `balances/{balanceId}`

```json
{"groupId":"groupId","userId":"userId","paid":"850.00","consumed":"600.00","balance":"250.00","updatedAt":"Timestamp"}
```

Todo campo monetario (`amount`, `originalAmount`, `convertedAmount`, `exchangeRate`, `paid`, `consumed`, `balance`) se persiste como cadena decimal, nunca como número nativo de Firestore, para evitar la representación en punto flotante (`double`) que usa internamente ese tipo. `percentage` sigue la misma regla por su sensibilidad decimal; `shares` es un entero de ponderación y puede persistirse como número.

Balances son materializados y regenerables; no se editan manualmente.

### Catálogos y soporte

- `categories/{id}`: nombre, icono, color y orden. Catálogo global gestionado por la plataforma, compartido por todos los grupos; no hay colección ni gestión por grupo.
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
- `invitations`: `groupId + status`, `email + status`.

## Convenciones

- IDs UUID v7 o automáticos de Firestore; nunca incrementales.
- Fechas como `Timestamp`, nunca texto.
- Monedas ISO-4217: `USD`, `COP`, `EUR`, `MXN`, `GTQ`.
- Soft delete con estados `ACTIVE`, `ARCHIVED`, `DELETED`.
- Auditoría, liquidaciones confirmadas y tasas históricas no se eliminan.

## Denormalización y migraciones

Solo denormalizar para reducir lecturas de manera significativa y con sincronización clara (por ejemplo, nombre de grupo en una notificación). Los datos financieros no se duplican como fuente de verdad.

Toda migración mantiene compatibilidad cuando sea posible, se registra en `Decisions.md`, incluye scripts si afecta datos y actualiza este documento.
