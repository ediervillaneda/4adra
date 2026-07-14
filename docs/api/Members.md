# Members.md

> **Área:** API / Membresías, roles e invitaciones  
> **Versión API:** v1

## Alcance

Describe las operaciones detalladas de miembros de un grupo. La membresía es la relación entre un usuario y un grupo; conserva rol, estado y fecha de incorporación. Remover un miembro nunca borra gastos, repartos, liquidaciones ni auditoría histórica.

## Listar miembros

```http
GET /api/v1/groups/{groupId}/members?status=ACTIVE&limit=100&pageToken=...
```

Todo miembro activo puede consultar el listado. Respuesta `200`:

```json
{
  "data": [
    {
      "userId": "usr_ana",
      "displayName": "Ana Pérez",
      "photoUrl": null,
      "role": "OWNER",
      "status": "ACTIVE",
      "joinedAt": "2026-07-13T12:00:00Z"
    }
  ],
  "meta": { "nextPageToken": null, "requestId": "req_123" }
}
```

No incluir correo u otros datos privados salvo que una política explícita de privacidad lo autorice.

## Invitar un miembro

```http
POST /api/v1/groups/{groupId}/members/invitations
Idempotency-Key: e25d9c11-271c-48f5-95e2-79e5a7903c51
```

```json
{ "email": "juan@example.com", "role": "MEMBER" }
```

Owner y Administrator pueden invitar. Roles asignables al invitar: `ADMINISTRATOR`, `MEMBER` y `READ_ONLY`; `OWNER` solo puede asignarse mediante transferencia de propiedad autorizada.

La invitación se asocia al correo normalizado, expira según configuración del sistema y es de un solo uso. Si el usuario ya es miembro activo, la solicitud debe ser idempotente o retornar `409 MEMBER_ALREADY_ACTIVE` sin crear una segunda membresía.

Respuesta `201`:

```json
{
  "data": {
    "invitationId": "inv_123",
    "groupId": "grp_123",
    "email": "juan@example.com",
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "2026-07-20T12:00:00Z"
  },
  "meta": { "requestId": "req_123" }
}
```

## Aceptar o rechazar invitación

```http
POST /api/v1/invitations/{invitationId}/accept
POST /api/v1/invitations/{invitationId}/decline
```

El actor debe coincidir con el correo/identidad invitada. Al aceptar se crea o reactiva una membresía `ACTIVE`, se registra `MemberInvited`/`MemberJoined` y se envía notificación. Una invitación expirada, revocada o ya procesada no puede reutilizarse.

## Cambiar rol

```http
PATCH /api/v1/groups/{groupId}/members/{userId}
If-Match: 2
Idempotency-Key: b390f61e-b971-4596-b91e-bdb34f1ef2f8
```

```json
{ "role": "ADMINISTRATOR" }
```

Solo Owner puede promover, degradar o transferir propiedad. Transferir `OWNER` debe ocurrir en una transacción: el destinatario se activa como Owner antes de degradar al anterior. El sistema rechaza una operación que deje el grupo sin Owner activo.

Los Administrators pueden modificar algunos estados operativos de miembros si la política lo permite, pero no cambiar roles ni gestionar Owners.

## Remover o abandonar grupo

```http
DELETE /api/v1/groups/{groupId}/members/{userId}
POST /api/v1/groups/{groupId}/leave
```

Owner puede remover miembros; Administrator puede remover Member o ReadOnly si la política del grupo lo permite. Un miembro puede abandonar el grupo solo si no es el último Owner y su balance en ese grupo es exactamente cero; lo mismo aplica para ser removido. No existe excepción por política de grupo: mientras el balance sea distinto de cero, ambas operaciones responden `409 OUTSTANDING_BALANCE`.

La remoción cambia el estado a `REMOVED`; el usuario no puede participar en gastos nuevos. Los registros históricos permanecen y los balances se recalculan cuando corresponda.

## Estados y errores

Estados de invitación: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `REVOKED`. Estados de membresía: `ACTIVE`, `REMOVED`, `INVITED`.

| Código | Situación |
|---|---|
| `INVITATION_NOT_FOUND` | Invitación inexistente o no visible |
| `INVITATION_EXPIRED` | Invitación vencida |
| `MEMBER_ALREADY_ACTIVE` | Usuario ya pertenece al grupo |
| `LAST_OWNER` | Operación dejaría al grupo sin Owner |
| `OUTSTANDING_BALANCE` | Salida no permitida por deuda pendiente |
| `PERMISSION_DENIED` | Rol insuficiente |

Todas las operaciones se auditan. Invitar, aceptar, cambiar rol, remover y abandonar emiten eventos y notificaciones pertinentes.
