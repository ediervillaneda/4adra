# Algorithms.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Especifica los algoritmos financieros oficiales. Una misma entrada debe dar exactamente la misma salida en cualquier implementación.

## Principios numéricos

- Algoritmos determinísticos, reproducibles, auditables e independientes de la plataforma.
- Nunca usar `float`/`double` para dinero. Usar `BigDecimal` (Kotlin/Java) y `Decimal.js` o equivalente en TypeScript.
- Mantener precisión máxima internamente. Solo redondear al presentar; si es inevitable, usar **Round Half Even**. Cada perfil puede declarar su estrategia de redondeo y su versión se guarda en el gasto.
- La unidad mínima de redondeo y de residuo depende de `decimalPlaces` de la `Currency` usada (ver `docs/domain/Currency.md`); no asumir siempre dos decimales, ya que cada moneda soportada declara su propia precisión.

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

## Recálculo y concurrencia

Crear, editar, eliminar o restaurar un gasto y confirmar una liquidación marcan el grupo `BalanceDirty` (evento `BalanceMarkedDirty`, ver `docs/domain/Balance.md` y `docs/domain/Events.md`). El backend recalcula de forma atómica respecto a la proyección `balances` y, al terminar, persiste `calculatedAt`, limpia la marca `isDirty` y publica `BalanceRecalculated`.

- Un recálculo administrativo (`POST /groups/{groupId}/balances/recalculate`) es idempotente: si ya hay uno en curso, responde `409 BALANCE_RECALCULATION_IN_PROGRESS` o reutiliza la operación existente mediante `Idempotency-Key`, según `docs/api/Balances.md`.
- Las sugerencias de liquidación (`GET /groups/{groupId}/settlement-suggestions`) nunca se generan sobre una proyección `isDirty`: el backend recalcula antes o informa el estado de recálculo en curso.
- Si el recálculo falla, se conserva o restaura la última proyección conocida y se registra el incidente; no se acepta una edición manual del balance como corrección.

## Estrategias de reparto

### Equal Split

`monto / participantes`. Para 120 entre 4: 30 para cada uno.

### Residuales

Se asignan de forma determinista: ordenar participantes por `UserId` ascendente y distribuir las unidades mínimas de moneda restantes en ese orden. Para 100.00 entre 3: 33.34, 33.33 y 33.33 según ese orden. La suma siempre debe coincidir exactamente con el monto.

### Percentage Split

`monto * porcentaje / 100`; validar que la suma sea 100 %. Aplicar la misma regla de residuales si la precisión de moneda lo requiere.

Ejemplo (`docs/examples/Expense.json`): Hotel de 500.00 USD con 50 % para cada uno de dos participantes produce 250.00 y 250.00. Un porcentaje individual negativo o una suma distinta de 100 se rechaza con `INVALID_SPLIT`.

### Exact Amount Split

Cada participante indica su importe; validar `Σ importes = total` en la precisión de la moneda.

Ejemplo: gasto de 90.00 con importes 40.00 y 50.00 es válido. 40.00 y 45.00 se rechaza (`Σ importes ≠ total`) con `INVALID_SPLIT`.

### Shares Split

`valorPorShare = monto / Σ shares`; cada importe es `sharesUsuario * valorPorShare`, seguido de asignación determinista de residuales. Las shares deben ser positivas.

Ejemplo: gasto de 100.00 con shares 1 y 2 (`Σ shares = 3`) produce `valorPorShare = 33.333...`; redondeados de forma independiente, los importes son 33.33 y 66.67, sumando exactamente 100.00. Cuando el redondeo independiente no cierra el total exacto, se aplica la misma regla de residuales que en Equal Split (orden por `UserId` ascendente). Shares cero, negativas o no numéricas se rechazan.

### Custom Split

> Disponible desde Roadmap Fase 2 (motor configurable), no en el MVP de Fase 1.

Combina reglas válidas (porcentajes, fijos y residuo). Resolver primero importes fijos, luego porcentajes sobre la base definida por el perfil y finalmente asignar residuo; rechazar totales negativos o inconsistentes.

Ejemplo: gasto de 200.00 con un importe fijo de 50.00 para un participante y el saldo restante (150.00) repartido 50/50 entre los otros dos produce 50.00, 75.00 y 75.00.

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
├── RoundingStrategy: HalfEven, HalfUp, AlwaysUp, AlwaysDown, None
└── ValidationStrategy: valida entradas antes de ejecutar el resto del motor
```

La estrategia se selecciona desde el perfil del grupo. Toda estrategia debe declarar identificador y versión, ser pura e idempotente. Las nuevas estrategias se registran sin cambiar a las existentes. El cálculo de un gasto usa la versión histórica guardada en él.

`ValidationStrategy` se ejecuta antes que cualquier otra estrategia y rechaza la operación completa si falla, sin persistir cambios parciales. Cubre, como mínimo: totales de split (`INVALID_SPLIT`), porcentajes o shares no positivos, participantes o pagador fuera del grupo o inactivos (`MEMBER_NOT_ACTIVE`), moneda o tasa no admitida (`CURRENCY_MISMATCH`), y para liquidaciones, origen igual a destino (`SELF_SETTLEMENT`), importe no positivo (`INVALID_SETTLEMENT_AMOUNT`) e importe superior a la deuda vigente (`SETTLEMENT_AMOUNT_EXCEEDS_DEBT`); ver `docs/ApiSpecification.md`, `docs/api/Expenses.md` y `docs/api/Settlements.md` para el catálogo completo de errores.

`docs/DatabaseSchema.md` persiste en `calculationProfiles/{id}` los nombres de las estrategias `split`, `settlement`, `rounding`, `currency` y `balance` de cada versión publicada; si `ValidationStrategy` llega a variar entre perfiles, su identificador y versión deben añadirse ahí para mantener la misma trazabilidad histórica que el resto del motor.

**Pendiente de especificar:** este documento define en detalle únicamente la variante por defecto de cada estrategia (`Equal`/`ExactAmount`/`Percentage`/`Shares`/`Custom` para split, `Classic` para balance —ver `docs/domain/Balance.md`—, `MinimumTransactions` para settlement, `HistoricRate` para moneda y `HalfEven` para redondeo). `CashFlow` y `Historical` (balance) y `DailyRate`, `ManualRate` y `AverageRate` (moneda) solo están nombradas, sin contrato (entradas, casos límite, pruebas doradas). Las settlement alternas (`Greedy`, `MinimumMoneyMoved`, `PriorityBased`, `RoundRobin`, en "Otras estrategias") tienen una descripción breve pero tampoco un contrato completo como `MinimumTransactions`. Conforme a `DevelopmentGuide.md`, ninguna debe implementarse sin definirse aquí primero.

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

### Confirmación y deuda vigente

Una sugerencia del optimizador no persiste nada; solo al crear una `Settlement` (`PENDING`) y confirmarla se afecta el balance. La confirmación revalida, dentro de la misma operación consistente, que la deuda aplicable sigue vigente: si el saldo cambió entre la creación y la confirmación y el importe ya no es válido, se responde `409 SETTLEMENT_AMOUNT_EXCEEDS_DEBT` y el cliente debe consultar balances antes de reintentar (`docs/api/Settlements.md`). El importe de la liquidación se valida contra la deuda expresada en la moneda base del grupo; la moneda de la liquidación debe ser una de las permitidas por el grupo.

Confirmar, cancelar y rechazar son idempotentes y auditables; una liquidación `CONFIRMED` nunca se edita, cancela ni elimina — una corrección se registra como una nueva liquidación compensatoria (`SettlementCompensated`), enlazada a la original cuando aplique.

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
| Repartos Equal/Percentage/Exact/Shares/Custom | O(n) |
| Conversión de moneda (por gasto) | O(1) |
| Recalcular balances | O(g + s + l) |
| Optimización de deudas | O(n log n) |

Donde `n` es el número de participantes del reparto y `g`, `s`, `l` son gastos, splits y liquidaciones activos del grupo, respectivamente.

Cada algoritmo requiere 100 % de cobertura con casos normales, extremos, monedas múltiples, decimales, importes altos, uno o miles de participantes, eliminados, liquidaciones parciales/completas, residuales y desempates deterministas.

## Referencias cruzadas

- `docs/domain/Money.md`, `docs/domain/Currency.md` — value objects `Money`, `Currency` y `ExchangeRate` que sustentan estos algoritmos.
- `docs/domain/Balance.md`, `docs/domain/Settlement.md`, `docs/domain/Expense.md` — invariantes y ciclo de vida de las entidades que el motor calcula.
- `docs/domain/Events.md` — eventos emitidos por cada recálculo, reparto o liquidación.
- `docs/api/Expenses.md`, `docs/api/Balances.md`, `docs/api/Settlements.md` — contrato HTTP, códigos de error y ejemplos de payload asociados a estos cálculos.
- `docs/examples/Expense.json`, `docs/examples/Settlement.json` — payloads de referencia usados en los ejemplos numéricos de este documento.
