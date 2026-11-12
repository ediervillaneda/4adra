# Plan — Historia #3 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como Owner o Administrator, quiero invitar a alguien por su correo, para sumarlo al grupo.

## Criterios de aceptación
- [x] Dado que soy Owner o Administrator de un grupo, cuando invito un correo de la lista de acceso con un rol (Administrador, Miembro o Solo lectura), entonces veo la confirmación "Invitación enviada" y la invitación queda pendiente durante 7 días. Si ese correo ya tenía una invitación pendiente en el grupo, se devuelve la misma y no se crea otra.
- [x] Dado que el correo no está en la lista de acceso de 4adra, o ya es de un miembro activo del grupo, cuando lo invito, entonces veo un mensaje que explica por qué, y no se crea ninguna invitación.
- [x] Dado que soy Miembro o Solo lectura, cuando abro el grupo, entonces no veo la opción de invitar, y si igual intento invitar por la API, recibo "permiso denegado".

## Plan
- Backend: un caso de uso que verifica el rol del actor en el grupo, que el correo esté en la lista de acceso y que no sea de un miembro activo, y luego guarda la invitación pendiente con su vencimiento (o devuelve la pendiente que ya existía). Registra auditoría.
- Base de datos: una migración nueva con la tabla de invitaciones.
- API: implementar `POST /groups/{groupId}/members/invitations` según el contrato, con los errores 403, 409 y el de correo sin acceso. Pruebas de integración y de contrato.
- PWA: en el detalle del grupo, el botón "Invitar" (solo para Owner y Administrator) abre un formulario con correo y rol, y muestra la confirmación o el error.
- Documentación: Members.md, DatabaseSchema, UISpecification, CHANGELOG, checklist de la Fase 1 y BACKLOG.md.

## Fuera de alcance
- Ver las invitaciones pendientes en el detalle del grupo (exponer correos requiere una decisión de privacidad aparte).
- Que el invitado vea, acepte o rechace la invitación (historia #4).
- El enlace de invitación (historia #5).
- Mandar un correo de aviso: no hay envío de correos, y las notificaciones son de la Fase 3.
- Cancelar o reenviar una invitación.
- El encabezado `Idempotency-Key`, que todavía no existe en ninguna mutación.

## Sugerencias (tú decides)
- El "¿es Owner o Administrator en este grupo?" lo necesitarán también las historias #6, #7, #9 y #10. Con una sola historia todavía no conviene sacar una abstracción, pero sí después de la segunda.
