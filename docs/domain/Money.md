# Money.md

> **Dominio:** 4adra / Money  
> **Estado:** Draft

## Propósito

`Money` es un value object inmutable que representa una cantidad monetaria exacta en una moneda concreta. Es obligatorio para importes financieros del dominio.

## Estructura

```text
Money
├── amount: Decimal
└── currency: CurrencyCode
```

`Decimal` debe provenir de una implementación de precisión arbitraria (Decimal.js o equivalente en TypeScript; `BigDecimal` si algún día existiera un cliente JVM). Nunca se representa con `float`, `double` o número JavaScript nativo para cálculo financiero.

## Operaciones permitidas

- Sumar/restar solo si las monedas son iguales.
- Comparar solo importes de igual moneda.
- Multiplicar por porcentaje, participación o tasa mediante precisión decimal.
- Convertir únicamente con un `ExchangeRate` explícito.
- Redondear con estrategia declarada por perfil y precisión de la moneda.

Una operación con monedas incompatibles falla con error de dominio; nunca realiza una conversión implícita.

## Serialización y presentación

En API, `amount` viaja como cadena decimal canónica (`"125.50"`). D1 lo persiste como `TEXT` decimal exacto (nunca `REAL`), según `DatabaseSchema.md`. La UI formatea `Money` según configuración regional, pero no altera su valor.

## Decimales por moneda

La unidad mínima depende de la moneda: **COP sin decimales** (pesos enteros); **USD, EUR, MXN y GTQ con dos**. En el backend, `Money` guarda el valor como entero de unidades mínimas (`bigint`), así que no necesita una librería decimal y nunca usa `number`. Un monto con más decimales de los que admite su moneda se rechaza (`INVALID_AMOUNT`), igual que `"150000.00"` en COP. El monto de un gasto debe ser positivo; una parte de un reparto puede ser `0` (1 COP entre 3 da 1, 0 y 0).

## Redondeo y residual

El cálculo mantiene precisión máxima. Cuando se requiere la unidad mínima de moneda, usa la estrategia del perfil (predeterminada Round Half Even) y distribuye residuales de manera determinista según `UserId` ascendente, como define `Algorithms.md`.
