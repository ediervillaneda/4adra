# Plan — Historia #6 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como Owner, quiero cambiar el rol de un miembro, para repartir los permisos.

## Criterios de aceptación
- [x] Dado que soy Owner de un grupo, cuando cambio el rol de un miembro activo a Propietario, Administrador, Miembro o Solo lectura, entonces veo su nuevo rol en la lista de miembros, y él tiene los permisos de ese rol desde su siguiente acción. Si soy Administrador, Miembro o Solo lectura, no veo la opción, y si igual lo intento por la API recibo "permiso denegado".
- [x] Dado que el grupo puede tener varios Owners, cuando promuevo a otro miembro a Propietario, degrado a otro Propietario o me degrado a mí mismo, entonces el cambio se aplica mientras quede al menos un Propietario activo. Si el cambio dejaría el grupo sin Propietario, veo "El grupo necesita al menos un Propietario" y no cambia nada. Si me degrado, dejo de ver las opciones de Propietario.
- [x] Dado que la persona ya no es miembro activo del grupo (o nunca lo fue), cuando intento cambiar su rol, entonces recibo "miembro no encontrado" y no cambia nada.

## Plan
- Backend: un caso de uso "cambiar rol", con auditoría. Solo un Owner activo puede usarlo: quien no es miembro recibe "grupo no encontrado" y los demás roles "permiso denegado". La persona debe ser miembro activo. Se rechaza el cambio que deje el grupo sin Owner, con la condición dentro de la misma escritura, para que dos cambios simultáneos no lo burlen. Sin migración.
- API: `PATCH /groups/{groupId}/members/{userId}` ya figura en el contrato, pero sin respuesta ni errores definidos. Hay que completarlo (`ApiSpecification.md`, `api/Members.md` y `openapi.yaml`) **con tu autorización antes de implementarlo**: cuerpo `{ role }`, respuesta `200` con la membresía, `400 VALIDATION_ERROR`, `403 PERMISSION_DENIED`, `404 GROUP_NOT_FOUND`, `404 MEMBER_NOT_FOUND` (código nuevo) y `409 LAST_OWNER`. Pruebas de integración y de contrato.
- PWA: en el detalle del grupo, el Owner ve "Cambiar rol" en cada miembro, que abre un diálogo con los cuatro roles. Al guardar, la lista muestra el rol nuevo. Si el Owner se degradó, la pantalla recarga su propio rol y oculta las acciones que ya no tiene. `LAST_OWNER` muestra su mensaje en el diálogo.
- Documentación: Members.md, UISpecification, CHANGELOG, el checklist de la Fase 1, TODO.md y BACKLOG.md.

## Fuera de alcance
- `If-Match` / `409 STALE_VERSION` e `Idempotency-Key`: el contrato los menciona, pero, como en las historias anteriores, por ahora se ignoran.
- Que un Administrator cambie roles: la matriz de `docs/Security.md` no lo permite.
- Remover miembros (historia #7) y salir del grupo (historia #8).
- Cambiar el rol de una invitación pendiente.
- Avisar a la persona de su nuevo rol (notificaciones, Fase 3).

## Sugerencias (tú decides)
- Las dos sugerencias de `/story` quedaron aprobadas e incorporadas al plan: el diálogo "Cambiar rol" sigue el patrón del diálogo "Compartir enlace" (`MatDialog` con datos de entrada), y la PWA suma, junto a `INVITABLE_ROLES`, una lista con los cuatro roles.

## Decisiones durante `/pair`
- El chequeo de rol de la #5 se generalizó a `findGroupWhereActorHasRole(…, roles)`, con `ROLES_THAT_INVITE` y `ROLES_THAT_CHANGE_ROLES` en `MemberRole.ts`.
- `toGroupMemberView` se extrajo para compartirla entre listar miembros y cambiar el rol.
- Un `userId` inválido responde `404 MEMBER_NOT_FOUND`, igual que uno inexistente.
- Tras cerrar el diálogo con cambio, el detalle recarga grupo y miembros (no se parchea la lista a mano): así refleja también la degradación del propio Owner.
- Tras `/code-review`: el `UPDATE` también exige que el actor siga siendo Owner activo (un Owner degradado a mitad de su petición recibe `403`), y un cambio que no se aplicó se explica leyendo en la misma transacción el rol del actor y los Owners activos, en vez de deducir `LAST_OWNER` de `changes = 0`. "Cancelar" cierra el diálogo sin resultado (antes `''`, que recargaba el detalle) y "Guardar" se deshabilita mientras el rol elegido sea el actual. `MemberRole` se deriva de `MEMBER_ROLES` en backend y PWA.
