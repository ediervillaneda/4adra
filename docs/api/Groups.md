# Groups.md

> **Área:** API / Grupos y membresías  
> **Versión API:** v1

## Crear grupo

```http
POST /api/v1/groups
Idempotency-Key: 591c3f9b-1f61-4c0f-8e4b-e3ebba0fa001
```

```json
{
  "name": "Viaje Guatemala",
  "description": "Vacaciones 2027",
  "defaultCurrency": "USD",
  "calculationProfileId": "default-v1"
}
```

El actor se crea como miembro `OWNER`. `description` es opcional. Si no se indica `calculationProfileId`, se utiliza el perfil predeterminado vigente. Responde `201` con grupo, membresía y versión de perfil activa.

Validar: nombre de 1 a 120 caracteres, moneda ISO admitida y perfil disponible. El nombre no necesita ser único globalmente.

## Consultar y listar grupos

```http
GET /api/v1/groups?status=ACTIVE&limit=25&pageToken=...
GET /api/v1/groups/{groupId}
```

Solo se devuelven grupos donde el actor tiene una membresía activa. La lista incluye resumen: `id`, `name`, `image`, `defaultCurrency`, `role`, `status`, `updatedAt` y, si procede, un resumen de balance del actor. No incluye gastos ni miembros completos.

## Editar y archivar

```http
PATCH /api/v1/groups/{groupId}
If-Match: 7
```

```json
{ "name": "Viaje Guatemala 2027", "description": "Junio", "image": null }
```

Owner o Administrator pueden modificar metadatos permitidos. El cambio de moneda base no está permitido si existen gastos activos, salvo migración administrativa aprobada.

```http
POST /api/v1/groups/{groupId}/archive
Idempotency-Key: 5e32a108-0235-49b1-bf72-91960f66a8e8
```

Solo Owner archiva. Un grupo archivado conserva datos históricos y queda de solo lectura, salvo operaciones administrativas de restauración documentadas.

## Miembros e invitaciones

```http
GET /api/v1/groups/{groupId}/members
POST /api/v1/groups/{groupId}/members/invitations
PATCH /api/v1/groups/{groupId}/members/{userId}
DELETE /api/v1/groups/{groupId}/members/{userId}
```

Invitación:

```json
{ "email": "juan@example.com", "role": "MEMBER" }
```

Owner y Administrator pueden invitar. Solo Owner cambia roles o remueve administradores/owners, conforme a la regla de que debe existir al menos un Owner activo. Una remoción desactiva membresía: no borra gastos ni liquidaciones históricas.

Roles permitidos: `OWNER`, `ADMINISTRATOR`, `MEMBER`, `READ_ONLY`. Un `READ_ONLY` no puede realizar mutaciones financieras.

## Perfil de cálculo del grupo

```http
GET /api/v1/groups/{groupId}/calculation-profile
PUT /api/v1/groups/{groupId}/calculation-profile
```

```json
{ "calculationProfileId": "min-transactions-v2" }
```

La lectura devuelve perfil, versión y fecha de activación. Owner o Administrator pueden activar un perfil publicado y permitido. La activación afecta gastos futuros; no altera el perfil/resultado almacenado en gastos previos. Perfiles no publicados, inexistentes o incompatibles retornan `422`.

## Errores

| Código | Situación |
|---|---|
| `GROUP_NOT_FOUND` | Grupo inexistente o no visible |
| `GROUP_ARCHIVED` | Mutación no permitida en grupo archivado |
| `PERMISSION_DENIED` | Rol insuficiente |
| `STALE_VERSION` | `If-Match` no coincide |
| `LAST_OWNER` | Intento de remover o degradar el último Owner |
| `INVALID_CALCULATION_PROFILE` | Perfil no disponible o incompatible |

Crear, editar, archivar, invitar, cambiar rol, remover miembro y activar perfil generan auditoría; los cambios pertinentes emiten eventos de dominio.
