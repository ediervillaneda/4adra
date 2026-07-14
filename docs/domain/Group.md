# Group.md

> **Dominio:** 4adra / Group  
> **Estado:** Draft

## Propósito

`Group` es el agregado raíz para personas que comparten gastos. Controla las reglas de membresía, estado, moneda base y perfil de cálculo. Los gastos, liquidaciones y balances siempre se interpretan dentro de un grupo.

## Propiedades

`id`, `name`, `description`, `image`, `defaultCurrency`, `createdBy`, `createdAt`, `updatedAt`, `status`, `calculationProfileId` y `calculationProfileVersion`.

Estados: `ACTIVE`, `ARCHIVED` y, solo por proceso administrativo documentado, `DELETED`.

## Invariantes

- Debe existir al menos un miembro `OWNER` activo.
- La moneda base usa ISO-4217 y no cambia si hay gastos activos, salvo migración explícita.
- Solo un perfil de cálculo publicado y compatible está activo para gastos futuros.
- Un grupo archivado conserva historial, no permite mutaciones financieras y sigue siendo consultable para miembros autorizados.

## Responsabilidades

- Crear y archivar grupo.
- Autorizar operaciones según membresía/rol.
- Activar perfiles de cálculo sin alterar gastos históricos.
- Mantener la consistencia de miembros, gastos y liquidaciones del agregado.

## Límites del agregado

Por escalabilidad, gastos y liquidaciones se persisten como colecciones separadas, pero las operaciones que cambian reglas de grupo verifican las invariantes del agregado con transacciones o mecanismos de consistencia adecuados. Ninguna entidad externa puede editar balances directamente.

## Eventos

`GroupCreated`, `GroupUpdated`, `GroupArchived`, `CalculationProfileActivated`, `MemberInvited`, `MemberJoined` y `MemberRemoved`.
