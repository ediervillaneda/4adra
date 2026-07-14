# Member.md

> **Dominio:** 4adra / Membership  
> **Estado:** Draft

## Propósito

`Membership` vincula un `User` con un `Group`. En la interfaz puede llamarse “miembro”; en dominio se usa la relación explícita para que rol y estado pertenezcan al grupo, no al usuario global.

## Propiedades

`groupId`, `userId`, `role`, `status`, `joinedAt`, `invitedAt`, `updatedAt` y, si aplica, referencias de invitación y auditoría.

Roles: `OWNER`, `ADMINISTRATOR`, `MEMBER`, `READ_ONLY`. Estados: `INVITED`, `ACTIVE`, `REMOVED`.

## Reglas de autorización

| Rol | Capacidades principales |
|---|---|
| Owner | Administración total, roles, archivo y transferencia de propiedad. |
| Administrator | Gastos, invitaciones y operaciones permitidas por política. |
| Member | Gastos propios permitidos y consulta. |
| ReadOnly | Solo consulta. |

Los permisos efectivos se evalúan en backend con la membresía activa; nunca se toman de parámetros enviados por cliente.

## Invariantes y transiciones

- Un usuario tiene, como máximo, una membresía vigente por grupo.
- Solo miembros `ACTIVE` participan en operaciones futuras.
- No se puede remover/degradar al último Owner activo.
- Una invitación aceptada crea o reactiva la membresía de modo idempotente.
- Remover un miembro conserva sus gastos y liquidaciones históricos, pero impide participación nueva.

Transferir propiedad es atómico: activar/promover destinatario antes de degradar propietario anterior. Abandonar grupo sigue las mismas reglas y la política de saldos pendientes.

## Eventos

`MemberInvited`, `MemberJoined`, `MemberRoleChanged`, `MemberRemoved` y `MemberLeft`.
