# Algorithms.md

> **Proyecto:** Expense Sharing Platform  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Especifica los algoritmos financieros oficiales. Una misma entrada debe dar exactamente la misma salida en cualquier implementación.

## Principios numéricos

- Algoritmos determinísticos, reproducibles, auditables e independientes de la plataforma.
- Nunca usar `float`/`double` para dinero. Usar `BigDecimal` (Kotlin/Java) y `Decimal.js` o equivalente en TypeScript.
- Mantener precisión máxima internamente. Solo redondear al presentar; si es inevitable, usar **Round Half Even**. Cada perfil puede declarar su estrategia de redondeo y su versión se guarda en el gasto.

## Balance

```text
Balance = TotalPagado - TotalConsumido
Σ Balance = 0
```

Saldo positivo recibe; negativo paga. El recálculo parte de cero, recorre gastos activos y splits, acumula pagado y consumido, aplica liquidaciones confirmadas y persiste la proyección `balances` del grupo afectado.

```text
Balances = 0 -> gastos/splits -> pagado y consumido -> liquidaciones -> balances
```

Ejecutarlo varias veces no altera el resultado: es idempotente.

## Estrategias de reparto

### Equal Split

`monto / participantes`. Para 120 entre 4: 30 para cada uno.

### Residuales

Se asignan de forma determinista: ordenar participantes por `UserId` ascendente y distribuir las unidades mínimas de moneda restantes en ese orden. Para 100.00 entre 3: 33.34, 33.33 y 33.33 según ese orden. La suma siempre debe coincidir exactamente con el monto.

### Percentage Split

`monto * porcentaje / 100`; validar que la suma sea 100 %. Aplicar la misma regla de residuales si la precisión de moneda lo requiere.

### Exact Amount Split

Cada participante indica su importe; validar `Σ importes = total` en la precisión de la moneda.

### Shares Split

`valorPorShare = monto / Σ shares`; cada importe es `sharesUsuario * valorPorShare`, seguido de asignación determinista de residuales. Las shares deben ser positivas.

### Custom Split

Combina reglas válidas (porcentajes, fijos y residuo). Resolver primero importes fijos, luego porcentajes sobre la base definida por el perfil y finalmente asignar residuo; rechazar totales negativos o inconsistentes.

## Moneda

Cada gasto almacena moneda original, monto original, tasa congelada y monto convertido a la moneda del grupo. Ejemplo: 100 USD con tasa 4,100 COP = 410,000 COP. Nunca actualizar gastos históricos con una tasa reciente.

## Motor de algoritmos configurable

`CalculationEngine` resuelve estrategias registradas por un `CalculationProfile` versionado:

```text
CalculationEngine
├── SplitStrategy: Equal, ExactAmount, Percentage, Shares, Custom
├── BalanceStrategy: Classic, CashFlow, Historical
├── SettlementStrategy: Greedy, MinimumTransactions, MinimumMoneyMoved, PriorityBased, RoundRobin
├── CurrencyStrategy: HistoricRate, DailyRate, ManualRate, AverageRate
└── RoundingStrategy: HalfEven, HalfUp, AlwaysUp, AlwaysDown, None
```

La estrategia se selecciona desde el perfil del grupo. Toda estrategia debe declarar identificador y versión, ser pura e idempotente. Las nuevas estrategias se registran sin cambiar a las existentes. El cálculo de un gasto usa la versión histórica guardada en él.

## Optimización de liquidaciones

La estrategia por defecto es `MinimumTransactions` mediante una variante greedy determinista:

1. Separar balances en acreedores (> 0) y deudores (< 0).
2. Ordenar acreedores por saldo descendente y `UserId` ascendente; ordenar deudores por deuda absoluta descendente y `UserId` ascendente.
3. Tomar el primer acreedor y deudor, transferir `min(acreencia, deuda)`.
4. Actualizar y retirar los que lleguen a cero.
5. Repetir hasta que no existan deudas.

Ejemplo: Ana +300, Juan -100, Pedro -200 produce Juan → Ana 100 y Pedro → Ana 200. Complejidad esperada: `O(n log n)` usando colas priorizadas.

Nunca producir ciclos evitables (`A -> B`, `B -> C`, `C -> A`). La estrategia debe devolver sugerencias; registrar/confirmar una liquidación es una operación separada.

### Otras estrategias

- `Greedy`: liquidación rápida basada en mayor deudor y acreedor.
- `MinimumTransactions`: objetivo predeterminado de menor número de transferencias, con desempates deterministas.
- `MinimumMoneyMoved`: prioriza reducir el dinero total movido cuando el modelo lo permita.
- `PriorityBased`: respeta un orden configurado de miembros.
- `RoundRobin`: distribuye transferencias de manera rotativa cuando el grupo lo prefiera.

Si una estrategia tiene requisitos adicionales, debe validarlos antes de ejecutarse y documentarlos en su perfil.

## Validaciones globales y casos límite

Siempre: `Σ Pagado = Σ Consumido` y `Σ Balance = 0` en moneda base del grupo. No permitir importes no positivos, pago a sí mismo ni liquidación superior a deuda.

- Grupo vacío o un participante: balances cero.
- Gasto consumido solo por su pagador: no crea deuda.
- Gasto eliminado: no se borra físicamente y se excluye del cálculo.
- Liquidaciones parciales y completas se aplican en el orden determinista de creación/confirmación.
- Cambiar gasto, split, moneda o liquidación marca el grupo `BalanceDirty`; el backend recalcula el grupo.

## Complejidad y pruebas

| Algoritmo | Complejidad |
|---|---|
| Repartos Equal/Percentage/Exact/Shares | O(n) |
| Recalcular balances | O(g + s + l) |
| Optimización de deudas | O(n log n) |

Cada algoritmo requiere 100 % de cobertura con casos normales, extremos, monedas múltiples, decimales, importes altos, uno o miles de participantes, eliminados, liquidaciones parciales/completas, residuales y desempates deterministas.
