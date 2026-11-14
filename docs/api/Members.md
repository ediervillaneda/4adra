# Members.md

> **Área:** API / Membresías, roles e invitaciones  
> **Versión API:** v1

## Alcance

Describe las operaciones detalladas de miembros de un grupo. La membresía es la relación entre un usuario y un grupo; conserva rol, estado y fecha de incorporación. Remover un miembro nunca borra gastos, repartos, liquidaciones ni auditoría histórica.

## Listar miembros

```http
GET /api/v1/groups/{groupId}/members?status=ACTIVE&limit=100&pageToken=...
```

**Implementado (pieza 2, historia #2).** Devuelve los miembros activos en orden alfabético por `displayName`, como en español (sin distinguir mayúsculas ni tildes), y desempata por `userId`. `displayName` y `photoUrl` salen del perfil del usuario. Si el grupo no existe o el actor no es miembro activo, responde `404 GROUP_NOT_FOUND`. Por ahora `status`, `limit` y `pageToken` se ignoran: solo se listan los miembros `ACTIVE`, sin paginación.

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

**Implementado (pieza 2, historia #3).** Solo se invitan correos de la lista de acceso de 4adra (ADR-018); si no está, responde `422 EMAIL_NOT_ALLOWED` y no se crea nada. Si el correo ya tiene una invitación `PENDING` vigente en el grupo, se devuelve esa misma con `201`, sin crear otra ni cambiarle el rol; una pendiente vencida no cuenta y se crea una nueva. Quien no es miembro activo recibe `404 GROUP_NOT_FOUND`; Member y ReadOnly reciben `403 PERMISSION_DENIED`, antes de consultar la lista de acceso. El cuerpo inválido responde `400 VALIDATION_ERROR` (`email`/`invalid_email`, `role`/`unsupported_role`, `body`/`must_be_object`). Por ahora no se envía aviso por correo, no se procesa `Idempotency-Key` y las invitaciones pendientes no se listan en el grupo.

Owner y Administrator pueden invitar. Roles asignables al invitar: `ADMINISTRATOR`, `MEMBER` y `READ_ONLY`; `OWNER` solo puede asignarse mediante transferencia de propiedad autorizada.

La invitación se asocia al correo normalizado, expira 7 días después de creada por defecto (`expiresAt = createdAt + 7 días`, ajustable vía `appSettings` según ADR-011) y es de un solo uso. Si el usuario ya es miembro activo, la solicitud debe ser idempotente o retornar `409 MEMBER_ALREADY_ACTIVE` sin crear una segunda membresía.

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

## Mis invitaciones

```http
GET /api/v1/invitations
```

Lista las invitaciones `PENDING` y vigentes (`expiresAt` posterior al momento de la consulta) dirigidas al correo normalizado del actor. No incluye vencidas, respondidas, revocadas ni dirigidas a otros correos. Muestra el nombre de quien invita, nunca su correo. Sin invitaciones, `data` es una lista vacía.

```json
{
  "data": [
    {
      "invitationId": "inv_123",
      "groupId": "grp_123",
      "groupName": "Viaje Guatemala",
      "invitedByName": "Ana",
      "role": "MEMBER",
      "expiresAt": "2026-07-20T12:00:00Z"
    }
  ],
  "meta": { "requestId": "req_123" }
}
```

## Aceptar o rechazar invitación

```http
POST /api/v1/invitations/{invitationId}/accept
POST /api/v1/invitations/{invitationId}/decline
```

El actor debe coincidir con el correo/identidad invitada; si no coincide, la respuesta es `404 INVITATION_NOT_FOUND`, sin revelar que la invitación existe. Al aceptar se crea una membresía `ACTIVE` con el rol ofrecido (y el perfil del actor, si aún no existe) y la invitación pasa a `ACCEPTED`; si el actor ya es miembro activo del grupo, la invitación igual pasa a `ACCEPTED`, sin duplicar la membresía ni cambiar su rol. Al rechazar, la invitación pasa a `DECLINED`. Ambas responden `200` con la `Invitation` en su nuevo estado.

El vencimiento se calcula con `expiresAt`; no se guarda como estado. Una invitación vencida responde `409 INVITATION_EXPIRED`, y una ya aceptada, rechazada o revocada responde `409 INVITATION_ALREADY_RESPONDED`. En ambos casos no cambia nada.

Pendiente: reactivar una membresía `REMOVED` al aceptar llega con la remoción de miembros; el evento `MemberJoined` y la notificación, con la Fase 3.

## Enlace de invitación

Un enlace sirve para que varias personas entren al grupo sin invitarlas una por una. Cada grupo tiene como máximo un enlace vigente. Quien entra por el enlace queda siempre como `MEMBER`. El enlace no da acceso a 4adra: solo puede usarlo quien ya está en la lista de acceso (ADR-018), porque las tres operaciones exigen sesión.

El código del enlace es aleatorio (al menos 128 bits) y en D1 solo se guarda su hash SHA-256. El código en claro aparece solo en la respuesta de creación. La PWA arma la URL a partir del código (`/unirse/{code}`).

### Crear el enlace

```http
POST /api/v1/groups/{groupId}/members/invite-link
```

Sin cuerpo. Solo Owner y Administrator. Crea un enlace nuevo, que vence 7 días después (`expiresAt = createdAt + 7 días`), y marca el anterior como reemplazado: desde ese momento el anterior responde `404 INVITE_LINK_NOT_FOUND`. Quien no es miembro activo recibe `404 GROUP_NOT_FOUND`; Member y ReadOnly reciben `403 PERMISSION_DENIED`.

Respuesta `201`:

```json
{
  "data": {
    "groupId": "grp_123",
    "code": "Hq3vX0b9r2kTqWm1Yp8sLA",
    "expiresAt": "2026-07-20T12:00:00Z"
  },
  "meta": { "requestId": "req_123" }
}
```

### Consultar un enlace

```http
GET /api/v1/invite-links/{code}
```

Cualquier usuario con sesión. Responde solo el nombre del grupo y el vencimiento, para mostrar "Te invitan a «…»". No revela miembros, moneda ni descripción.

Respuesta `200`:

```json
{
  "data": {
    "groupId": "grp_123",
    "groupName": "Viaje Guatemala",
    "expiresAt": "2026-07-20T12:00:00Z"
  },
  "meta": { "requestId": "req_123" }
}
```

### Unirse con el enlace

```http
POST /api/v1/invite-links/{code}/join
```

Sin cuerpo. Crea el perfil del actor si aún no existe y una membresía `ACTIVE` con rol `MEMBER`. Si el actor ya es miembro activo, no duplica la membresía ni cambia su rol, y responde igual. Una cuenta deshabilitada recibe `403 USER_DISABLED`.

Respuesta `200`, con la membresía del actor:

```json
{
  "data": {
    "groupId": "grp_123",
    "userId": "usr_juan",
    "role": "MEMBER",
    "status": "ACTIVE",
    "joinedAt": "2026-07-14T09:30:00Z"
  },
  "meta": { "requestId": "req_123" }
}
```

### Errores del enlace

Consultar y unirse responden lo mismo ante un enlace inválido: `404 INVITE_LINK_NOT_FOUND` si el código no existe, fue reemplazado o el grupo ya no está activo, y `409 INVITE_LINK_EXPIRED` si venció. En ningún caso cambia nada.

Pendiente: reactivar una membresía `REMOVED` al unirse llega con la remoción de miembros (historia #7). Anular un enlace sin crear otro, limitar sus usos o ver quién entró por él quedan fuera.

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
| `INVITATION_NOT_FOUND` | Invitación inexistente o dirigida a otro correo (`404`) |
| `INVITATION_EXPIRED` | Invitación vencida (`409`) |
| `INVITATION_ALREADY_RESPONDED` | Invitación ya aceptada, rechazada o revocada (`409`) |
| `INVITE_LINK_NOT_FOUND` | Enlace inexistente, reemplazado o de un grupo no activo (`404`) |
| `INVITE_LINK_EXPIRED` | Enlace vencido (`409`) |
| `MEMBER_ALREADY_ACTIVE` | Usuario ya pertenece al grupo |
| `EMAIL_NOT_ALLOWED` | El correo invitado no está en la lista de acceso (`422`, ADR-018) |
| `LAST_OWNER` | Operación dejaría al grupo sin Owner |
| `OUTSTANDING_BALANCE` | Salida no permitida por deuda pendiente |
| `PERMISSION_DENIED` | Rol insuficiente |

Todas las operaciones se auditan. Invitar, aceptar, cambiar rol, remover y abandonar emiten eventos y notificaciones pertinentes.
