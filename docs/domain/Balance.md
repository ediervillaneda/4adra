# Balance.md

> **Dominio:** 4adra / Balance  
> **Estado:** Draft

## Propósito

`Balance` es una proyección regenerable de la posición financiera de un miembro en un grupo. No se modifica manualmente y no constituye el libro histórico de transacciones.

## Propiedades

`groupId`, `userId`, `currency`, `paid`, `consumed`, `balance`, `updatedAt`, `calculationRunId` y estado de proyección cuando sea necesario.

```text
balance = paid - consumed
```

Saldo positivo significa que el miembro debe recibir; saldo negativo, que debe aportar.

## Fuentes y cálculo

El `BalanceCalculator` inicia acumulados en cero, recorre gastos activos y sus splits, aplica liquidaciones confirmadas y persiste el resultado en moneda base. Las tasas históricas y las versiones de perfil guardadas en gastos garantizan reproducibilidad.

Invariantes globales:

```text
Σ pagado = Σ consumido
Σ balance = 0
```

## Ciclo de vida

Crear/editar/eliminar/restaurar un gasto o confirmar una liquidación marca el grupo `BalanceDirty`. El backend recalcula de forma idempotente y atómica respecto a la proyección. Si falla, conserva o restaura una proyección conocida y registra el incidente; no acepta ediciones manuales.

## Relación con sugerencias

El `DebtOptimizer` recibe balances calculados y devuelve transferencias sugeridas. La sugerencia no cambia balances; solo una `Settlement` confirmada lo hace.

## Eventos

`BalanceMarkedDirty` y `BalanceRecalculated`.
