# BusinessRules.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define qué operaciones están permitidas y cómo se comporta la plataforma. Estas reglas prevalecen sobre decisiones de implementación.

## Principios generales

- La información financiera se deriva de gastos, participaciones y liquidaciones. Los balances no se editan manualmente.
- El historial es inmutable y toda modificación es auditable.
- Un gasto tiene exactamente un pagador. Si varias personas pagaron, se crean gastos separados.
- La tasa de conversión usada queda congelada y los gastos históricos no se recalculan con nuevas tasas.

## Usuarios y grupos

Un usuario puede crear y pertenecer a grupos, registrar gastos y confirmar liquidaciones. No puede acceder ni modificar grupos sin pertenencia, ni borrar auditoría.

Un miembro no puede abandonar el grupo ni ser removido mientras su balance en ese grupo sea distinto de cero: debe liquidarse (total o parcialmente hasta llegar a cero) antes de que la salida sea válida. No existe excepción por política de grupo para esta regla.

Un grupo debe conservar al menos un propietario, puede tener administradores, gastos y archivarse; archivarlo no elimina sus registros.

| Rol | Permisos principales |
|---|---|
| Owner | Administrar, roles, miembros y archivo |
| Administrator | Gastos, invitaciones y confirmación de liquidaciones |
| Member | Registrar, editar y eliminar cualquier gasto activo del grupo, comentar y consultar balances |
| ReadOnly | Consultar información |

Un administrador no puede eliminar al propietario. Un Member puede editar o eliminar (soft delete) cualquier gasto activo del grupo, no solo los que registró.

## Gastos y repartos

Todo gasto requiere grupo, pagador, moneda, monto positivo, fecha y tipo de división. No se aceptan montos cero o negativos, monedas inexistentes ni grupos inexistentes.

Tipos: `Equal`, `ExactAmount`, `Percentage`, `Shares`, `Custom`. El MVP (Roadmap Fase 1) habilita `Equal`, `ExactAmount`, `Percentage` y `Shares`; `Custom` se habilita en Fase 2 junto con el motor de perfiles configurable.

- Igual: todos aportan lo mismo.
- Monto exacto: la suma coincide con el gasto.
- Porcentaje: la suma es exactamente 100 %.
- Participaciones: el sistema calcula proporciones.
- Personalizado: debe ser consistente y totalizar el gasto.

Solo miembros activos del grupo pueden participar en gastos nuevos. Un miembro eliminado permanece en el historial.

## Perfil de cálculo

Cada grupo tiene un `CalculationProfile` versionado. Determina estrategias de división, balance, conversión, redondeo y generación de liquidaciones. Un cambio de perfil no altera el resultado histórico de gastos existentes: cada gasto mantiene la versión con que fue creado.

## Balances y liquidaciones

```text
Balance = Pagado - Consumido
```

Positivo: recibe; negativo: paga; cero: saldado. La suma de balances de un grupo es cero.

Una liquidación no modifica gastos; solo reduce deuda. Estados: `Pending`, `Confirmed`, `Rejected`, `Cancelled`. Al confirmarse, actualiza balances y genera auditoría y evento. No puede tener importe menor o igual a cero, origen igual a destino ni exceder la deuda aplicable.

## Adjuntos, comentarios y categorías

Las categorías son un catálogo global gestionado por la plataforma, común a todos los grupos (no configurable por grupo). Adjuntos (imágenes, PDF, facturas y comprobantes) se guardan en Firebase Storage, no Firestore. Los comentarios son una capacidad planificada para `Roadmap.md` Fase 3 (no forman parte del modelo de entidades ni del esquema actual): cuando se especifiquen, no deberán alterar gastos ni balances, y deberán formar parte del historial auditable.

## Eliminación, auditoría y notificaciones

Usar soft delete (`ACTIVE`, `ARCHIVED`, `DELETED`). Nunca eliminar físicamente auditoría, liquidaciones confirmadas ni tasas históricas.

Crear, editar, eliminar, restaurar, confirmar y cancelar son auditables. Las invitaciones, gastos, modificaciones, liquidaciones, roles, eliminaciones y archivado generan notificaciones pertinentes.

## Reglas de consistencia

1. Cada gasto pertenece a un grupo y tiene un pagador.
2. Participantes y pagador pertenecen al grupo.
3. Los splits totalizan el gasto.
4. Toda liquidación corresponde a una deuda existente y no es consigo mismo.
5. Los balances se regeneran; jamás se editan.
6. Toda modificación genera auditoría y las operaciones importantes, un evento de dominio.
7. La información financiera no se borra físicamente.

## Rendimiento y agentes IA

Minimizar lecturas y escrituras, usar índices, recalcular solo lo necesario y evitar N+1. Los agentes deben respetar estas reglas, reutilizar lógica, escribir pruebas y actualizar documentación. Las reglas de negocio existen exclusivamente en el backend.
