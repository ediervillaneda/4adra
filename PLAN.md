# Plan — Historia #7 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como Owner, quiero remover a un miembro, para sacar a quien ya no participa.

## Criterios de aceptación
- [ ] Dado que soy Owner de un grupo, cuando elijo "Remover" en un miembro y confirmo en el aviso "¿Remover a «…» del grupo?", entonces deja de aparecer en la lista de miembros. Si soy Administrador, solo puedo remover a Miembros y a Solo lectura. Si soy Miembro o Solo lectura, no veo la opción, y si igual lo intento por la API recibo "permiso denegado". En mi propia fila no aparece "Remover": para irme está "Salir" (historia #8), y si igual lo intento por la API recibo un error.
- [ ] Dado que me removieron de un grupo, cuando abro Inicio o el grupo, entonces ya no lo veo: desaparece de Inicio y su detalle dice "Grupo no encontrado". Si quien remueve ya no tiene permiso o la persona ya no es miembro activo, no cambia nada y recibe "permiso denegado" o "miembro no encontrado".
- [ ] Dado que me removieron, cuando me vuelven a invitar por correo y acepto, o entro con un enlace vigente, entonces vuelvo a ser miembro activo con el rol de la invitación (o Miembro, por enlace) y el grupo reaparece en Inicio.

## Plan
- Backend: un caso de uso "remover miembro", con auditoría. Owner remueve a cualquiera menos a sí mismo; Administrator, solo a Miembros y a Solo lectura. La persona debe ser miembro activo, y la membresía queda como removida (nunca se borra). El permiso del actor se vuelve a comprobar en la misma escritura, como en el cambio de rol, para que un actor degradado a mitad de camino no remueva a nadie. Sin migración.
- Reingreso: aceptar una invitación y unirse con un enlace hoy ignoran una membresía removida (responden "activo", pero la persona sigue fuera). Ambos caminos deben reactivarla con el rol nuevo y una fecha de ingreso nueva. Es el pendiente que la #5 dejó para esta historia.
- API: `DELETE /groups/{groupId}/members/{userId}` ya figura en el contrato, pero sin respuesta ni errores completos. Hay que completarlo (`ApiSpecification.md`, `api/Members.md` y `openapi.yaml`) **con tu autorización antes de implementarlo**: `200` con la membresía (estado `REMOVED`), `403 PERMISSION_DENIED`, `404 GROUP_NOT_FOUND`, `404 MEMBER_NOT_FOUND` y el código nuevo `409 CANNOT_REMOVE_SELF`. También hay que corregir en `Members.md` el "si la política del grupo lo permite", que no existe. Pruebas de integración y de contrato.
- PWA: en el detalle del grupo, "Remover" en cada miembro que el actor puede sacar, con un diálogo de confirmación. Al confirmar, la lista se recarga; un error se muestra en el diálogo.
- Documentación: Members.md, UISpecification, CHANGELOG, el checklist de la Fase 1, TODO.md (cerrar el pendiente de la #5) y BACKLOG.md.

## Fuera de alcance
- La regla de balance distinto de cero (`409 OUTSTANDING_BALANCE`): entra con los gastos (pieza 3), y en esta pieza todo balance es cero.
- Salir del grupo (historia #8).
- Anular las invitaciones pendientes que envió quien fue removido, o las que tenga hacia ese grupo.
- `If-Match` e `Idempotency-Key`: se ignoran, como en las historias anteriores.
- Avisar a la persona removida (notificaciones, Fase 3).
- Ver la lista de miembros removidos.

## Sugerencias (tú decides)
- Las dos sugerencias de `/story` quedaron aprobadas e incorporadas al plan:
  - Un diálogo de confirmación genérico (título, texto y botón), que reusarán Salir (#8) y Archivar (#10), en vez de tres casi iguales.
  - Una sola regla de dominio, `canRemove(actorRole, targetRole)`, para quién remueve a quién, usada por el caso de uso y reflejada en la condición de D1.
- Decisiones de `/story`: el Administrator remueve solo a Member y ReadOnly (matriz de `docs/Security.md`, sin "política del grupo"); removerse a sí mismo se rechaza (`409 CANNOT_REMOVE_SELF`), porque para eso está Salir (#8).

## Decisiones durante `/pair`
