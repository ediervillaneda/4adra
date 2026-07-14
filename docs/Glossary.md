# Glossary.md

> **Proyecto:** Expense Sharing Platform  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Establece el lenguaje ubicuo del producto. Los nombres de UI, API, modelo de dominio, documentación y pruebas deben usar estos términos de manera consistente.

| Término | Definición |
|---|---|
| Adjunto (`Attachment`) | Archivo asociado a un gasto, almacenado en Firebase Storage. |
| Agregado | Conjunto de entidades y reglas con una raíz de consistencia. En este dominio, `Group` es el agregado principal. |
| Auditoría (`AuditLog`) | Registro inmutable de quién hizo una operación, cuándo y qué cambió. |
| Balance | Posición calculada de un miembro: total pagado menos total consumido, considerando liquidaciones confirmadas. |
| Cálculo histórico | Resultado reproducible usando la tasa, perfil y versión preservados en el gasto. |
| Calculation Engine | Servicio de dominio que selecciona y ejecuta estrategias de cálculo. |
| Calculation Profile | Configuración versionada de estrategias de reparto, balance, moneda, redondeo, validación y liquidación para un grupo. |
| Categoría | Clasificación configurable de un gasto, por ejemplo Hotel o Transporte. |
| Cliente | Aplicación Android o Web que consume la API; no es autoridad de reglas financieras. |
| Deudor | Miembro con balance negativo que debe aportar dinero. |
| Domain Event | Hecho relevante de negocio ocurrido, por ejemplo `ExpenseCreated`. |
| Gasto (`Expense`) | Registro de un pago con un único pagador, importe, moneda, fecha y distribución. |
| Grupo (`Group`) | Conjunto de miembros que comparten gastos, reglas de cálculo y balances. |
| Idempotencia | Propiedad por la que repetir una operación con la misma clave y entrada no duplica efectos. |
| Liquidación (`Settlement`) | Pago registrado entre dos miembros para reducir deuda; no modifica gastos. |
| Member | Rol de membresía que puede registrar gastos y consultar información conforme a política. |
| Membresía (`Membership`) | Relación entre un usuario y un grupo, con rol y estado. |
| Moneda base | Moneda en la que el grupo consolida sus balances. |
| Monto convertido | Importe de gasto expresado en moneda base con la tasa histórica aplicada. |
| Monto original | Importe pagado en la moneda original del gasto. |
| Owner | Miembro propietario del grupo. Debe existir siempre al menos uno activo. |
| Pagador (`PaidBy`) | Miembro que efectuó el pago registrado en un gasto. |
| Participante | Miembro incluido en el reparto de un gasto. |
| Perfil activo | Versión de perfil seleccionada por un grupo para gastos futuros. |
| Reparto (`Split`) | Distribución del consumo de un gasto entre participantes. |
| Residual | Unidad mínima de moneda no distribuida tras división o redondeo; se asigna determinísticamente. |
| Rol | Nivel de autorización de una membresía: Owner, Administrator, Member o ReadOnly. |
| Soft delete | Cambio de estado que excluye un registro activo sin borrar su historial físico. |
| Strategy | Algoritmo intercambiable con contrato definido, por ejemplo `PercentageSplitStrategy`. |
| Tasa histórica (`ExchangeRate`) | Tipo de cambio congelado y asociado al gasto; nunca se recalcula automáticamente. |
| Transacción | Operación atómica de persistencia; no equivale necesariamente a una liquidación. |
| Usuario (`User`) | Persona autenticada en la plataforma. |
| Value Object | Objeto sin identidad, comparado por valor, como `Money`, `Percentage` o `CurrencyCode`. |

## Reglas de terminología

- Usar **gasto**, no “deuda”, para el registro de un pago.
- Usar **liquidación** para una transferencia registrada; **sugerencia de liquidación** para un resultado no persistido del optimizador.
- Usar **balance** para el valor calculado, no como sinónimo de saldo bancario.
- Usar **miembro** para una persona dentro de un grupo y **usuario** para su identidad global.
- Usar **perfil de cálculo** para la configuración versionada; no “algoritmo del grupo” si incluye más de una estrategia.
- Usar **eliminado** solo para `soft delete`; “borrado físico” requiere una operación administrativa excepcional y explícita.
