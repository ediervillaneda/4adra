# Events.md

> **Dominio:** 4adra / Eventos de dominio  
> **Estado:** Draft

## Propósito

Los eventos de dominio describen hechos ya ocurridos. Permiten desacoplar auditoría, notificaciones, recálculos, analítica y automatizaciones. Un evento no es un comando ni reemplaza una transacción de negocio.

## Contrato común

```text
eventId, eventType, occurredAt, aggregateType, aggregateId,
groupId?, actorId?, correlationId, causationId?, payloadVersion, payload
```

Los eventos son inmutables, incluyen versión de payload y se publican después de que la transacción principal sea durable. Los consumidores son idempotentes usando `eventId`; el orden no debe asumirse entre agregados distintos.

## Catálogo

| Evento | Hecho |
|---|---|
| `GroupCreated`, `GroupUpdated`, `GroupArchived` | Cambio relevante de grupo. |
| `MemberInvited`, `MemberJoined`, `MemberRoleChanged`, `MemberRemoved` | Cambio de membresía. |
| `CalculationProfileActivated` | Perfil nuevo activado para gastos futuros. |
| `ExpenseCreated`, `ExpenseUpdated`, `ExpenseDeleted`, `ExpenseRestored` | Cambio de gasto. |
| `AttachmentAdded`, `AttachmentRemoved` | Cambio de comprobante asociado. |
| `BalanceMarkedDirty`, `BalanceRecalculated` | Estado o proyección de balances cambió. |
| `SettlementCreated`, `SettlementConfirmed`, `SettlementRejected`, `SettlementCancelled`, `SettlementCompensated` | Cambio de liquidación. |
| `ExchangeRateCaptured` | Tasa aceptada para uso futuro. |

## Consumidores típicos

- Auditoría: persiste actor, valores relevantes y correlación.
- Proyección de balances: responde a mutaciones financieras idempotentemente.
- Notificaciones: informa solo a miembros autorizados y aplica preferencias.
- Analítica: usa eventos sin convertirse en fuente de verdad financiera.

## Reglas de seguridad y evolución

El payload contiene solo datos mínimos y no expone tokens, secretos ni PII innecesaria. Cambios incompatibles crean un nuevo `payloadVersion`; los consumidores mantienen compatibilidad durante la migración. Los fallos de consumo se reintentan con política definida y se monitorean, sin repetir la operación financiera original.
