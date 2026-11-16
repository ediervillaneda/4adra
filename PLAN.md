# Plan — Historia #8 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como miembro, quiero salir de un grupo, para dejar de verlo.

## Criterios de aceptación
- [ ] Dado que soy miembro activo de un grupo (con cualquier rol), cuando elijo "Salir del grupo" en su detalle y confirmo en el aviso "¿Salir de «…»?", entonces vuelvo a Inicio y el grupo ya no aparece; si abro su enlace, veo "Grupo no encontrado".
- [ ] Dado que soy el único Propietario del grupo, cuando intento salir, entonces veo "El grupo necesita al menos un Propietario" y sigo en el grupo. Para salir, primero tengo que nombrar a otro Propietario, aunque sea la única persona del grupo.
- [ ] Dado que salí de un grupo, cuando me vuelven a invitar y acepto, o entro con un enlace vigente, entonces vuelvo a ser miembro activo y el grupo reaparece en Inicio.

## Plan
- Backend: un caso de uso "salir del grupo", con auditoría. El actor debe ser miembro activo, y su membresía queda como removida (igual que al ser removido; nunca se borra). Si es Owner, la escritura exige en la misma sentencia que quede otro Owner activo (la misma condición del cambio de rol), para que dos Owners que salen a la vez no dejen el grupo sin ninguno. Sin migración.
- Reingreso: ya funciona desde la #7 (aceptar una invitación o unirse con un enlace reactiva una membresía removida); solo hace falta una prueba que lo confirme para quien salió.
- API: `POST /groups/{groupId}/leave` ya figura en el contrato, pero incompleto. Hay que completarlo (`ApiSpecification.md`, `api/Members.md` y `openapi.yaml`) **con tu autorización antes de implementarlo**: `200` con la membresía (estado `REMOVED`), `404 GROUP_NOT_FOUND` y `409 LAST_OWNER`; `OUTSTANDING_BALANCE` queda para la pieza 3. Pruebas de integración y de contrato.
- PWA: en el detalle del grupo, "Salir del grupo" para cualquier miembro, con el diálogo de confirmación genérico de la #7. Al confirmar, vuelve a Inicio; un `LAST_OWNER` se muestra en el diálogo.
- Documentación: Members.md, UISpecification, CHANGELOG, el checklist de la Fase 1, TODO.md y BACKLOG.md.

## Fuera de alcance
- La regla de balance distinto de cero (`409 OUTSTANDING_BALANCE`): entra con los gastos (pieza 3).
- Transferir la propiedad en el mismo paso (nombrar a otro Owner desde el diálogo de salir): hoy son dos pasos, "Cambiar rol" y luego "Salir".
- Qué pasa con un grupo en el que nadie más quiere quedarse: eso es archivarlo (#10).
- Distinguir "salió" de "lo removieron" en la base de datos: ambas quedan como removidas; la auditoría las diferencia por la ruta.
- Anular las invitaciones pendientes que envió quien sale.
- `If-Match` e `Idempotency-Key`: se ignoran, como en las historias anteriores.

## Sugerencias (tú decides)
- Las dos sugerencias de `/story` quedaron aprobadas e incorporadas al plan:
  - La condición "que quede otro Owner activo", que ya usa el cambio de rol, se escribe una sola vez en el repositorio y la comparten cambiar rol y salir, en vez de copiarla en una segunda sentencia SQL.
  - El escenario de integración (`signIn`, `createGroupAs`, `joinAsMember`, que hoy se repiten en `memberRoles`, `removeMember` e `inviteLinks`) se extrae a un ayudante compartido.

## Decisiones durante `/pair`
