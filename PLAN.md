# Plan — Historia #10 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como Owner, quiero archivar un grupo, para sacarlo de Inicio sin perder sus registros.

## Criterios de aceptación
- [ ] Dado que soy Owner de un grupo, cuando elijo "Archivar grupo" en su detalle y confirmo el aviso "¿Archivar «…»? No se puede deshacer", entonces vuelvo a Inicio y el grupo deja de estar entre los grupos activos, para mí y para todos los miembros: pasa a la sección "Archivados", que aparece plegada. Si soy Administrador, Miembro o Solo lectura, no veo la opción, y si igual lo intento por la API recibo "permiso denegado".
- [ ] Dado que un grupo está archivado, cuando un miembro lo abre desde "Archivados", entonces ve sus datos y sus miembros con el aviso "Grupo archivado", y sin ninguna acción (editar, invitar, compartir enlace, cambiar rol, remover, salir). Si igual intenta cambiar algo por la API, recibe "grupo archivado" y no cambia nada.
- [ ] Dado que un grupo está archivado, cuando alguien tiene una invitación pendiente a ese grupo o abre un enlace de invitación suyo, entonces la invitación ya no aparece en Inicio ni se puede aceptar, y el enlace muestra que ya no sirve.

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
