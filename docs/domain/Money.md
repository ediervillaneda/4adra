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

`Decimal` debe provenir de una implementación de precisión arbitraria (`BigDecimal` en Kotlin/Java; Decimal.js o equivalente en TypeScript). Nunca se representa con `float`, `double` o número JavaScript nativo para cálculo financiero.

## Operaciones permitidas

- Sumar/restar solo si las monedas son iguales.
- Comparar solo importes de igual moneda.
- Multiplicar por porcentaje, participación o tasa mediante precisión decimal.
- Convertir únicamente con un `ExchangeRate` explícito.
- Redondear con estrategia declarada por perfil y precisión de la moneda.

Una operación con monedas incompatibles falla con error de dominio; nunca realiza una conversión implícita.

## Serialización y presentación

En API, `amount` viaja como cadena decimal canónica (`"125.50"`). Firestore persiste una representación decimal segura definida por Infrastructure. La UI formatea `Money` según configuración regional, pero no altera su valor.

## Redondeo y residual

El cálculo mantiene precisión máxima. Cuando se requiere la unidad mínima de moneda, usa la estrategia del perfil (predeterminada Round Half Even) y distribuye residuales de manera determinista según `UserId` ascendente, como define `Algorithms.md`.
