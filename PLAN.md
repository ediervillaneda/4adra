# Plan — Historia #4 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como invitado, quiero ver mis invitaciones pendientes y aceptarlas o rechazarlas, para decidir si entro al grupo.

## Criterios de aceptación
- [ ] Dado que tengo invitaciones pendientes y vigentes dirigidas a mi correo, cuando abro Inicio, entonces las veo en una sección \"Invitaciones\" con el nombre del grupo, quién me invitó y el rol que me ofrecen. Si no tengo ninguna, la sección no aparece. No veo invitaciones vencidas, aceptadas ni rechazadas, ni las dirigidas a otros correos.
- [ ] Dado que tengo una invitación pendiente y vigente, cuando la acepto, entonces quedo como miembro activo del grupo con el rol ofrecido, el grupo aparece en mi lista de Inicio, y la invitación deja de aparecer como pendiente.
- [ ] Dado que tengo una invitación pendiente y vigente, cuando la rechazo, entonces desaparece de mi lista, no entro al grupo, y el grupo no revela nada más de mí.
- [ ] Dado que la invitación venció, ya fue respondida, o no es para mi correo, cuando intento aceptarla o rechazarla (por ejemplo desde la API), entonces recibo un error claro y no cambia nada. Una invitación ajena responde como \"no encontrada\", sin revelar que existe.
- [ ] Dado que ya soy miembro activo del grupo por otra vía, cuando acepto una invitación pendiente de ese grupo, entonces la invitación se cierra sin duplicar mi membresía y mi rol actual no cambia.

## Plan
- Backend: casos de uso para listar las invitaciones pendientes y vigentes del actor (por su correo normalizado), aceptar y rechazar. Aceptar inserta la membresía activa y cierra la invitación en un solo `db.batch`; `UNIQUE (group_id, user_id)` protege contra doble aceptación concurrente. Vencimiento evaluado con reloj inyectado. Auditoría de ambas operaciones.
- Base de datos: probablemente sin migración. `invitations` ya trae estado y `expires_at`. Confirmar que el estado final (`ACCEPTED`/`DECLINED`) cabe en el `CHECK` actual; si no, migración `0005`.
- API: `POST /invitations/{invitationId}/accept` y `POST /invitations/{invitationId}/decline` (ya en `ApiSpecification.md`), y un `GET /invitations` para listar las del actor (**no está en el contrato: hay que agregarlo a `ApiSpecification.md`, `api/Members.md` y `openapi.yaml` con tu autorización antes de implementarlo**). Errores: 404 de invitación, y uno para vencida o ya respondida. Pruebas de integración y de contrato.
- PWA: sección \"Invitaciones\" en Inicio con tarjeta por invitación y botones Aceptar y Rechazar, estados de carga y error, y al aceptar, refrescar la lista de grupos. Textos en `shared/texts.ts`; tareas con `PendingTasks`.
- Documentación: Members.md, DatabaseSchema (si hay migración), UISpecification (\"Invitación recibida\"), CHANGELOG, checklist de la Fase 1, BACKLOG.md y TODO.md.

## Fuera de alcance
- Aviso por correo o notificación al invitado: no hay envío de correos; notificaciones son de la Fase 3.
- Que el Owner o Administrator vea las invitaciones pendientes del grupo, y cancelar o reenviar (decisión de privacidad aparte).
- El enlace de invitación (historia #5).
- Pantalla propia de invitaciones o enlaces profundos: todo vive en Inicio.
- El encabezado `Idempotency-Key`.
- Reactivar una membresía `REMOVED` al aceptar: llega con la historia #7 (remover miembros).

## Sugerencias (tú decides)
- Decidir cómo se llama el estado de rechazo en la base (`DECLINED`) y si \"vencida\" se guarda o solo se calcula con `expires_at`. Calcularla evita un job que la marque.
- Con esta historia ya hay dos casos de uso que escriben membresías. El chequeo \"¿es Owner o Administrator?\" aún no se repite; extraerlo cuando llegue la #6.
- Mostrar el nombre de quien invita expone su nombre al invitado antes de aceptar. Es poco sensible (sin correo), pero conviene confirmarlo.
