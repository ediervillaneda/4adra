# Currency.md

> **Dominio:** 4adra / Currency y ExchangeRate  
> **Estado:** Draft

## Currency

`Currency` es un value object de moneda ISO-4217.

| Propiedad | Descripción |
|---|---|
| `code` | Código de tres letras, por ejemplo `USD`, `COP`, `EUR`, `GTQ`. |
| `symbol` | Símbolo de presentación; no es identificador de negocio. |
| `decimalPlaces` | Unidades decimales admitidas por la moneda. |

El código es obligatorio en todo `Money`. La configuración de monedas soportadas es global, pero un grupo define una moneda base.

## ExchangeRate

`ExchangeRate` representa una conversión explícita:

```text
fromCurrency, toCurrency, rate: Decimal, capturedAt, provider, source
```

La tasa debe ser positiva. Para convertir `amount` de origen a destino, multiplicar con precisión decimal y aplicar redondeo solo según la regla requerida. Una tasa usada en un gasto queda congelada junto con el gasto; no se recalcula por actualizaciones del proveedor.

## Estrategias de moneda

El `CalculationProfile` puede seleccionar `HistoricRate`, `ManualRate`, `DailyRate` u otra estrategia publicada. La estrategia resuelve una tasa antes de crear el gasto. El resultado de esa resolución, no la estrategia viva, es lo que se conserva para reproducir historia.

## Reglas

- No convertir implícitamente entre monedas.
- No editar una tasa histórica usada; corregir mediante gasto/operación auditada conforme a política.
- Mostrar siempre código de moneda junto al símbolo en contextos ambiguos.
- Validar proveedor, fecha y precisión antes de aceptar una tasa externa.
