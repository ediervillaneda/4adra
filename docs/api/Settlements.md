# Settlements.md

> **Área:** API / Liquidaciones  
> **Versión API:** v1

## Alcance

Una liquidación registra una transferencia entre dos miembros para reducir una deuda. No modifica gastos ni repartos. Solo las liquidaciones `CONFIRMED` afectan balances; una sugerencia del optimizador no es una liquidación.

## Crear liquidación pendiente

```http
POST /api/v1/groups/{groupId}/settlements
Idempotency-Key: 3e3545ed-9fef-4e65-aecc-9951e40a70f5
```

```json
{
  "fromUser": "usr_juan",
  "toUser": "usr_ana",
  "amount": "250.00",
  "currency": "USD",
  "method": "BANK_TRANSFER",
  "note": "Hotel"
}
```

El actor debe tener permiso de crear liquidaciones y el origen/destino deben ser miembros válidos. `amount` es decimal positivo; `fromUser` y `toUser` deben diferir. La moneda debe ser compatible con la moneda de liquidación permitida por el grupo.

Respuesta `201`:

```json
{
  "data": {
    "id": "set_123",
    "groupId": "grp_123",
    "fromUser": "usr_juan",
    "toUser": "usr_ana",
    "amount": "250.00",
    "currency": "USD",
    "method": "BANK_TRANSFER",
    "note": "Hotel",
    "status": "PENDING",
    "createdAt": "2027-06-14T15:15:00Z",
    "confirmedAt": null,
    "resourceVersion": 1
  },
  "meta": { "requestId": "req_123" }
}
```

La creación valida que exista deuda aplicable según la política. El grupo puede permitir un importe parcial; nunca uno superior a la deuda vigente sin una autorización explícita y documentada.

## Consultar liquidaciones

```http
GET /api/v1/groups/{groupId}/settlements?status=PENDING&fromUser=usr_juan&toUser=usr_ana&limit=25&pageToken=...
GET /api/v1/groups/{groupId}/settlements/{settlementId}
```

Miembros activos pueden consultar las liquidaciones del grupo conforme a su rol. La lista se ordena por fecha de creación descendente y después por ID.

## Confirmar

```http
POST /api/v1/groups/{groupId}/settlements/{settlementId}/confirm
If-Match: 1
Idempotency-Key: c19c5c61-af0e-4bbf-a8e2-3f3f8f0a6de7
```

Solo el pagador, destinatario, Owner o Administrator pueden confirmar según la política del grupo. El backend vuelve a validar estado, membresías y deuda vigente dentro de la transacción. Al confirmar:

1. Cambia estado a `CONFIRMED` y registra `confirmedAt`.
2. Actualiza/recalcula balances de forma consistente.
3. Registra auditoría y emite `SettlementConfirmed`.
4. Notifica a las partes correspondientes.

Si el saldo cambió y el importe ya no es válido, se responde `409 SETTLEMENT_AMOUNT_EXCEEDS_DEBT`; el cliente debe consultar balances y crear una operación adecuada.

## Cancelar o rechazar

```http
POST /api/v1/groups/{groupId}/settlements/{settlementId}/cancel
POST /api/v1/groups/{groupId}/settlements/{settlementId}/reject
```

Solo una liquidación `PENDING` puede cancelarse o rechazarse. Cancelar suele corresponder al creador; rechazar al destinatario, Owner o Administrator. Ambos conservan el registro histórico y no alteran balances.

Una liquidación confirmada no se edita, cancela ni elimina. Una corrección se modela como una nueva liquidación compensatoria, con enlace auditado a la original si corresponde.

## Estados y errores

Estados: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`.

| Código | Situación |
|---|---|
| `SETTLEMENT_NOT_FOUND` | Liquidación inexistente o fuera del grupo |
| `INVALID_SETTLEMENT_AMOUNT` | Importe no positivo o formato inválido |
| `SELF_SETTLEMENT` | Origen y destino son el mismo usuario |
| `SETTLEMENT_AMOUNT_EXCEEDS_DEBT` | Importe superior a deuda vigente |
| `INVALID_SETTLEMENT_STATE` | Transición de estado no permitida |
| `STALE_VERSION` | Confirmación concurrente |
| `PERMISSION_DENIED` | Rol insuficiente |

Crear, confirmar, cancelar y rechazar son operaciones auditables e idempotentes.
