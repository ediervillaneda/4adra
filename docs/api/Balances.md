# Balances.md

> **Área:** API / Balances y sugerencias de liquidación  
> **Versión API:** v1

## Alcance

Los balances son una proyección regenerable, no una fuente editable de verdad. Se calculan exclusivamente a partir de gastos activos, sus repartos y liquidaciones confirmadas, usando la moneda base y reglas históricas aplicables del grupo.

## Consultar balances

```http
GET /api/v1/groups/{groupId}/balances
```

Todo miembro activo puede consultar. Respuesta `200`:

```json
{
  "data": {
    "groupId": "grp_123",
    "currency": "USD",
    "calculatedAt": "2027-06-14T15:12:00Z",
    "isDirty": false,
    "members": [
      {
        "userId": "usr_ana",
        "paid": "500.00",
        "consumed": "250.00",
        "balance": "250.00"
      },
      {
        "userId": "usr_juan",
        "paid": "0.00",
        "consumed": "250.00",
        "balance": "-250.00"
      }
    ]
  },
  "meta": { "requestId": "req_123" }
}
```

Invariantes de respuesta: `paid - consumed = balance` por miembro, y la suma de balances es exactamente cero en moneda base. Los importes son cadenas decimales.

## Recálculo

```http
POST /api/v1/groups/{groupId}/balances/recalculate
Idempotency-Key: 79d574c0-7767-4adf-a770-b5ee591c13a8
```

El recálculo ordinario se desencadena automáticamente tras mutaciones financieras. Este endpoint existe para Owner/Administrator, recuperación operativa o reconciliación controlada. No acepta importes ni balances en el cuerpo.

El backend reconstruye la proyección de forma idempotente, persiste `calculatedAt`, limpia `isDirty` y crea evento `BalanceRecalculated` y auditoría. Si ya hay un recálculo en curso devuelve `409 BALANCE_RECALCULATION_IN_PROGRESS` o reutiliza la operación idempotente.

## Sugerencias de liquidación

```http
GET /api/v1/groups/{groupId}/settlement-suggestions
```

Parámetros opcionales: `profileId` solo para simulaciones autorizadas y `includeZeroBalances=false`. La consulta no crea ni confirma liquidaciones.

Respuesta `200`:

```json
{
  "data": {
    "groupId": "grp_123",
    "currency": "USD",
    "calculationProfile": { "id": "default-v1", "version": 1 },
    "strategy": "MINIMUM_TRANSACTIONS",
    "basedOnCalculatedAt": "2027-06-14T15:12:00Z",
    "suggestions": [
      { "fromUser": "usr_juan", "toUser": "usr_ana", "amount": "250.00" }
    ]
  },
  "meta": { "requestId": "req_123" }
}
```

El algoritmo ordena empates de manera determinista según `Algorithms.md`. Si `isDirty` es verdadero, el backend recálcula antes de generar la sugerencia o devuelve el estado de recálculo, sin usar proyecciones obsoletas.

## Simulaciones con perfil

Una simulación puede usar un perfil publicado sin activarlo en el grupo. Debe devolver el perfil/versionado utilizado y nunca persistir cambios en gastos, balances ni liquidaciones. Está destinada a comparar estrategias; los resultados históricos siguen ligados a la versión almacenada en cada gasto.

## Errores

| Código | Situación |
|---|---|
| `GROUP_NOT_FOUND` | Grupo inexistente o no accesible |
| `GROUP_ARCHIVED` | Operación mutante no permitida |
| `BALANCE_RECALCULATION_IN_PROGRESS` | Existe recálculo activo |
| `INVALID_CALCULATION_PROFILE` | Perfil de simulación inválido |
| `PERMISSION_DENIED` | Rol insuficiente |

No existe endpoint para editar un balance. Cualquier discrepancia se resuelve identificando y corrigiendo la operación fuente mediante una acción auditada.
