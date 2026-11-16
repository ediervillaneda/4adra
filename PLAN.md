# Plan — Historia #10 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como Owner, quiero archivar un grupo, para sacarlo de Inicio sin perder sus registros.

## Criterios de aceptación
- [x] Dado que soy Owner de un grupo, cuando elijo "Archivar grupo" en su detalle y confirmo el aviso "¿Archivar «…»? No se puede deshacer", entonces vuelvo a Inicio y el grupo deja de estar entre los grupos activos, para mí y para todos los miembros: pasa a la sección "Archivados", que aparece plegada. Si soy Administrador, Miembro o Solo lectura, no veo la opción, y si igual lo intento por la API recibo "permiso denegado".
- [x] Dado que un grupo está archivado, cuando un miembro lo abre desde "Archivados", entonces ve sus datos y sus miembros con el aviso "Grupo archivado", y sin ninguna acción (editar, invitar, compartir enlace, cambiar rol, remover, salir). Si igual intenta cambiar algo por la API, recibe "grupo archivado" y no cambia nada.
- [x] Dado que un grupo está archivado, cuando alguien tiene una invitación pendiente a ese grupo o abre un enlace de invitación suyo, entonces la invitación ya no aparece en Inicio ni se puede aceptar, y el enlace muestra que ya no sirve.

## Plan
- Backend, archivar: un caso de uso "archivar grupo", solo para el Owner y con auditoría. El estado pasa a archivado, y suben la versión y la fecha de actualización. Archivar un grupo ya archivado responde igual, sin cambios. Sin migración (el estado archivado ya existe en la tabla).
- Backend, solo lectura: cada operación que cambia un grupo o sus miembros (editar, invitar, crear enlace, cambiar rol, remover, salir, aceptar una invitación y unirse con un enlace) rechaza un grupo archivado con "grupo archivado". Las invitaciones pendientes de un grupo archivado dejan de listarse, y sus enlaces dejan de servir. Listar mis grupos ya devuelve el estado de cada uno.
- API: `POST /groups/{groupId}/archive` ya figura en el contrato, pero sin respuesta ni errores. Hay que completarlo (`docs/api/Groups.md`, `ApiSpecification.md` y `openapi.yaml`) **con tu autorización antes de implementarlo**: `200` con el grupo, `403 PERMISSION_DENIED` y `404 GROUP_NOT_FOUND`. También hay que fijar `409 GROUP_ARCHIVED` (el código ya figura en Groups.md, sin estado HTTP) en las mutaciones del grupo y aclarar que el archivado es irreversible desde la app. Pruebas de integración y de contrato.
- PWA: "Archivar grupo" en el detalle, solo para el Owner, con el diálogo de confirmación genérico; al confirmar, vuelve a Inicio. Inicio separa los grupos activos de una sección "Archivados", que aparece plegada. El detalle de un grupo archivado muestra el aviso "Grupo archivado" y oculta todas las acciones.
- Documentación: Groups.md, Members.md, UISpecification, CHANGELOG, el checklist de la Fase 1, TODO.md (cerrar el pendiente "no listar ni aceptar invitaciones de un grupo archivado") y BACKLOG.md.

## Fuera de alcance
- Desarchivar: es irreversible desde la app; restaurar queda como operación administrativa.
- Eliminar el grupo (estado `DELETED`).
- Una carrera entre archivar y otra operación al mismo tiempo (por ejemplo, editar justo cuando se archiva): se revisa al leer, no dentro de cada escritura.
- Avisar a los miembros (notificaciones, Fase 3).
- Ordenar o buscar entre los archivados.

## Sugerencias (tú decides)
- La primera sugerencia de `/story` quedó aprobada e incorporada al plan: un solo chequeo de "grupo activo". Editar, invitar, crear enlace y cambiar rol ya pasan por `findGroupWhereActorHasRole`, que revisa ahí el estado del grupo; remover, salir, aceptar y unirse reusan la misma función de dominio.
- La segunda sugerencia (dividir la historia en dos) se descartó: la historia queda junta, para no dejar por un tiempo grupos archivados que todavía se pueden cambiar.
- Decisiones de `/story`: los archivados se ven en una sección "Archivados" de Inicio, plegada, y su detalle es de solo lectura; el archivado es irreversible desde la app.

## Decisiones durante `/pair`
- Orden de chequeos en un grupo archivado: no miembro (`404`), archivado (`409 GROUP_ARCHIVED`) y rol (`403`). Así, cualquier miembro que intente cambiarlo recibe "grupo archivado", aunque su rol tampoco se lo permitiera. `Group.ensureActive()` lanza `GroupArchivedException`; lo llaman `findGroupWhereActorHasRole` (editar, invitar, crear enlace, cambiar rol), remover, salir y aceptar una invitación. Unirse con un enlace ya respondía `404 INVITE_LINK_NOT_FOUND`, porque la consulta del enlace filtra grupos activos.
- Archivar no pasa por `findGroupWhereActorHasRole`: `GroupRepository.archive` es un `UPDATE groups … WHERE status = 'ACTIVE' AND EXISTS (Owner activo)` seguido de un `SELECT` en el mismo `batch`, que dice si el actor no es miembro (`404`) o no es Owner (`403`). Un grupo ya archivado no cambia y se devuelve igual (`200`, sin subir la versión).
- Salir vuelve a leer el grupo (`findForMember`) antes de escribir, para saber si está archivado: son dos idas a D1, como antes de la #8.
- Aceptar una invitación lee el grupo con el método nuevo `GroupRepository.findById`; `AcceptInvitationUseCase` recibe ahora el repositorio de grupos.
- `ListMyInvitations`: el filtro de grupos activos va en la consulta (`AND g.status = 'ACTIVE'`), igual que en los enlaces.
- Inicio: "Mis grupos" muestra solo los activos; si no hay ninguno activo aparece el estado vacío, y debajo la sección "Archivados (n)", un `<details>` plegado.
- Tras `/code-review`: aceptar valida primero la invitación y después el grupo, así una invitación cerrada de un grupo archivado se informa como cerrada. `ensureActive()` rechaza todo estado distinto de `ACTIVE` (hoy solo existe `ARCHIVED`; no hubo prueba en rojo posible). En la PWA, `GROUP_ARCHIVED` quita la invitación de Inicio ("Ese grupo fue archivado."), los diálogos de salir, remover, cambiar rol e invitar dicen "El grupo está archivado.", la edición de un grupo archivado (al cargar o al guardar) muestra un aviso sin el formulario, e Inicio con solo archivados titula "No tienes grupos activos". Quedan fuera las carreras entre archivar y otra escritura, y el diálogo de compartir enlace sigue con el error genérico.
- Pasaron sin rojo: unirse con el enlace de un grupo archivado y ocultar la sección "Archivados" cuando no hay archivados (el comportamiento ya existía). La prueba de contrato y la de `createApp` se escribieron después del código (la primera solo falló al quitar a propósito el mapeo `GROUP_ARCHIVED → 409`); la de `createApp` se sumó para la cobertura de la capa de presentación.
