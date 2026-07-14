# Expense.md

> **Dominio:** 4adra / Expense  
> **Estado:** Draft

## Propósito

`Expense` representa un pago individual realizado por un único miembro dentro de un grupo. Es la fuente financiera de pagado y consumido; no representa una liquidación ni una transferencia entre personas.

## Propiedades

| Propiedad | Descripción |
|---|---|
| `id` | Identificador inmutable del gasto. |
| `groupId` | Grupo al que pertenece. |
| `title`, `description`, `categoryId` | Metadatos descriptivos. |
| `paidBy` | Único miembro que efectuó el pago. |
| `originalAmount`, `currency` | Valor y divisa originales. |
| `exchangeRate`, `convertedAmount` | Tasa congelada y valor en moneda base. |
| `expenseDate` | Fecha económica del gasto. |
| `split` | Distribución calculada entre participantes. |
| `calculationProfileVersion` | Perfil/versión usado para resolverlo. |
| `status` | `ACTIVE`, `DELETED` o estado definido por política. |
| Auditoría | Autor y fechas de creación/actualización. |

## Invariantes

- Pertenece a exactamente un grupo y tiene exactamente un pagador activo al crearse.
- El monto original es positivo y usa `Money`; nunca flotante.
- Los participantes del reparto pertenecen al grupo y los importes calculados totalizan el gasto exactamente.
- La tasa utilizada, importe convertido y perfil/versionado se preservan para reproducción histórica.
- Un gasto eliminado queda fuera del balance, pero no se borra físicamente.

## Comportamiento

`create`, `update`, `softDelete` y `restore` validan invariantes, generan eventos y requieren auditoría. Al editar un gasto se conserva historial de cambios. La edición usa la versión histórica del perfil, salvo migración explícita y aprobada; no se cambia retroactivamente una tasa ni estrategia publicada.

## Relación con balances

Un gasto activo incrementa el total pagado del `paidBy` por `convertedAmount` y el total consumido de cada participante por su importe convertido. La suma de participaciones coincide con el importe convertido. Los balances se regeneran; no se almacenan dentro del gasto.

## Eventos

`ExpenseCreated`, `ExpenseUpdated`, `ExpenseDeleted`, `ExpenseRestored` y, cuando corresponda, `AttachmentAdded` o `AttachmentRemoved`.
