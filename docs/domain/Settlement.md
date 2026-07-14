# Settlement.md

> **Dominio:** 4adra / Settlement  
> **Estado:** Draft

## Propósito

`Settlement` registra una transferencia entre miembros para disminuir deuda. No altera gastos ni repartos. Las sugerencias del optimizador son efímeras y no son entidades `Settlement` hasta que se crean explícitamente.

## Propiedades

`id`, `groupId`, `fromUser`, `toUser`, `amount`, `currency`, `method`, `note`, `status`, `createdAt`, `createdBy`, `confirmedAt`, `resourceVersion` y vínculo opcional con una operación compensatoria.

Estados: `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`.

## Invariantes

- Origen y destino son distintos y miembros válidos del grupo.
- El importe es `Money` positivo y usa una moneda permitida para liquidación.
- Solo `CONFIRMED` afecta balances.
- La confirmación valida nuevamente la deuda aplicable dentro de la operación consistente.
- Una liquidación confirmada no se modifica, cancela ni elimina; se corrige con otra liquidación compensatoria auditada.

## Transiciones

`PENDING -> CONFIRMED | REJECTED | CANCELLED`. No hay transiciones desde estados finales. Confirmar actualiza los balances/proyección del grupo, registra auditoría y emite evento. Rechazar o cancelar no altera balances.

## Eventos

`SettlementCreated`, `SettlementConfirmed`, `SettlementRejected`, `SettlementCancelled` y `SettlementCompensated`.
