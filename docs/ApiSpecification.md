# ApiSpecification.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define el contrato HTTP público para Android y Web. Firebase Cloud Functions implementa la API y es la única vía para operaciones críticas; las reglas de negocio y autorización se ejecutan en el servidor.

## Convenciones generales

- Base URL: `https://<region>-<project>.cloudfunctions.net/api/v1`.
- HTTPS y JSON UTF-8 obligatorios.
- Autenticación: `Authorization: Bearer <Firebase-ID-token>`.
- Fechas: ISO 8601 en respuestas; `Timestamp` de Firestore en persistencia.
- Monedas: ISO-4217; importes como cadenas decimales (`"125.50"`), nunca punto flotante.
- IDs opacos; el cliente no interpreta su estructura.
- Toda mutación exige encabezado `Idempotency-Key` UUID. Repetir clave y carga devuelve el mismo resultado.

## Respuestas y errores

```json
{ "data": {}, "meta": { "requestId": "req_123" } }
```

```json
{
  "error": {
    "code": "INVALID_SPLIT",
    "message": "La distribución no totaliza el gasto.",
    "details": [{ "field": "splits", "reason": "TOTAL_MISMATCH" }]
  },
  "meta": { "requestId": "req_123" }
}
```

| HTTP | Código | Uso |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_SPLIT` | Solicitud inválida |
| 401 | `UNAUTHENTICATED` | Token ausente o inválido |
| 403 | `PERMISSION_DENIED` | Permisos insuficientes |
| 404 | `GROUP_NOT_FOUND` | Recurso inexistente o no visible |
| 409 | `STALE_VERSION`, `CONFLICT` | Conflicto de concurrencia |
| 422 | `CURRENCY_MISMATCH` | Regla de dominio incumplida |
| 429 | `RATE_LIMITED` | Límite de solicitudes |
| 500 | `INTERNAL_ERROR` | Error inesperado |

Listas: `limit` entre 1 y 100 (25 por defecto) y `pageToken` para paginación.

La tabla anterior es un resumen; cada recurso documenta su catálogo completo de códigos en `docs/api/*.md` (por ejemplo `MEMBER_ALREADY_ACTIVE`, `LAST_OWNER`, `OUTSTANDING_BALANCE` en `Members.md`, o `SELF_SETTLEMENT`, `SETTLEMENT_AMOUNT_EXCEEDS_DEBT` en `Settlements.md`).

## Recursos

### Perfil autenticado

| Método y ruta | Descripción |
|---|---|
| `GET /me` | Obtiene el perfil actual |
| `PATCH /me` | Actualiza nombre, foto, idioma, zona horaria y moneda preferida |

### Grupos y miembros

| Método y ruta | Descripción |
|---|---|
| `POST /groups` | Crea grupo y membresía Owner |
| `GET /groups` | Lista grupos del usuario |
| `GET /groups/{groupId}` | Consulta grupo |
| `PATCH /groups/{groupId}` | Edita metadatos |
| `POST /groups/{groupId}/archive` | Archiva grupo |
| `GET /groups/{groupId}/members` | Lista miembros |
| `POST /groups/{groupId}/members/invitations` | Invita miembro |
| `POST /invitations/{invitationId}/accept` | Acepta una invitación pendiente dirigida al actor |
| `POST /invitations/{invitationId}/decline` | Rechaza una invitación pendiente dirigida al actor |
| `PATCH /groups/{groupId}/members/{userId}` | Cambia rol o estado |
| `DELETE /groups/{groupId}/members/{userId}` | Remueve membresía (Owner/Administrator) |
| `POST /groups/{groupId}/leave` | El actor abandona el grupo (si no es el último Owner y no tiene deuda pendiente) |

```json
POST /groups
{
  "name": "Viaje Guatemala",
  "description": "Vacaciones 2027",
  "defaultCurrency": "USD",
  "calculationProfileId": "default-v1"
}
```

### Gastos

| Método y ruta | Descripción |
|---|---|
| `POST /groups/{groupId}/expenses` | Registra gasto y splits |
| `GET /groups/{groupId}/expenses` | Lista gastos y filtros |
| `GET /groups/{groupId}/expenses/{expenseId}` | Consulta gasto |
| `PATCH /groups/{groupId}/expenses/{expenseId}` | Modifica gasto activo |
| `DELETE /groups/{groupId}/expenses/{expenseId}` | Soft delete |
| `POST /groups/{groupId}/expenses/{expenseId}/restore` | Restaura gasto |

```json
POST /groups/grp_123/expenses
{
  "title": "Hotel",
  "description": "Primera noche",
  "categoryId": "lodging",
  "paidBy": "usr_ana",
  "amount": "500.00",
  "currency": "USD",
  "exchangeRate": "1.000000",
  "expenseDate": "2027-06-14T00:00:00Z",
  "split": {
    "type": "PERCENTAGE",
    "participants": [
      { "userId": "usr_ana", "percentage": "50" },
      { "userId": "usr_juan", "percentage": "50" }
    ]
  }
}
```

El servidor valida miembros activos, congela tasa y versión del perfil, guarda auditoría y recalcula balances. Actualizaciones requieren `If-Match: <resourceVersion>` y devuelven `409 STALE_VERSION` si hay desfase.

### Balances, sugerencias y liquidaciones

| Método y ruta | Descripción |
|---|---|
| `GET /groups/{groupId}/balances` | Obtiene balances materializados |
| `POST /groups/{groupId}/balances/recalculate` | Recálculo administrativo autorizado |
| `GET /groups/{groupId}/settlement-suggestions` | Genera sugerencias sin persistir pagos |
| `POST /groups/{groupId}/settlements` | Registra liquidación pendiente |
| `GET /groups/{groupId}/settlements` | Lista liquidaciones |
| `POST /groups/{groupId}/settlements/{settlementId}/confirm` | Confirma liquidación |
| `POST /groups/{groupId}/settlements/{settlementId}/cancel` | Cancela una pendiente |

```json
POST /groups/grp_123/settlements
{
  "fromUser": "usr_juan",
  "toUser": "usr_ana",
  "amount": "250.00",
  "currency": "USD",
  "method": "BANK_TRANSFER",
  "note": "Hotel"
}
```

Una confirmada no se modifica; una corrección se registra como operación compensatoria.

### Categorías

| Método y ruta | Descripción |
|---|---|
| `GET /categories` | Lista el catálogo global de categorías (compartido por todos los grupos) |

Las categorías son un catálogo gestionado por la plataforma, no por cada grupo; este endpoint es de solo lectura para los clientes. Su administración (alta/edición) es una operación interna fuera del alcance de este contrato.

### Perfiles, reportes y adjuntos

| Método y ruta | Descripción |
|---|---|
| `GET /calculation-profiles` | Lista perfiles disponibles |
| `GET /calculation-profiles/{profileId}` | Consulta perfil y versión |
| `PUT /groups/{groupId}/calculation-profile` | Activa perfil para cálculos futuros |
| `POST /groups/{groupId}/reports` | Solicita CSV, XLSX, PDF o JSON |
| `POST /groups/{groupId}/expenses/{expenseId}/attachments/upload-url` | Crea URL firmada de carga |
| `DELETE /groups/{groupId}/expenses/{expenseId}/attachments/{attachmentId}` | Elimina adjunto autorizado |

Los perfiles publicados son inmutables. Solo Owner o Administrator pueden activar uno, conforme a política del grupo.

## Eventos y versionado

Las mutaciones emiten eventos internos: `ExpenseCreated`, `ExpenseUpdated`, `ExpenseDeleted`, `SettlementCreated`, `SettlementConfirmed`, `MemberInvited`, `GroupArchived` y `BalanceRecalculated`.

La versión mayor está en la ruta (`v1`). Agregar campos opcionales es compatible; eliminar o cambiar semántica exige una nueva versión mayor y un periodo de deprecación de al menos 90 días entre el anuncio y el retiro de la versión anterior (ADR-011).
