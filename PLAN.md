# Plan — Historia #9 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como Owner, quiero editar el nombre y la descripción del grupo, para mantenerlo al día.

## Criterios de aceptación
- [ ] Dado que soy Owner o Administrador de un grupo, cuando elijo "Editar" en su detalle, cambio el nombre o la descripción y guardo, entonces vuelvo al detalle con los datos nuevos, y los demás miembros también los ven en Inicio y en el detalle. Si dejo la descripción vacía, el grupo queda sin descripción. La moneda base se ve, pero no se puede cambiar.
- [ ] Dado que escribo un nombre vacío o demasiado largo, o una descripción demasiado larga, cuando intento guardar, entonces veo junto al campo el mismo mensaje que al crear el grupo y no cambia nada.
- [ ] Dado que soy Miembro o Solo lectura, cuando abro el grupo, entonces no veo "Editar", y si igual lo intento por la API o por la ruta, recibo "permiso denegado" y no cambia nada.

## Plan
- Backend: un caso de uso "editar grupo", con auditoría. Solo Owner y Administrator; quien no es miembro activo recibe "grupo no encontrado". Valida nombre y descripción con las mismas reglas que al crear el grupo (nombre de 1 a 120 caracteres, descripción opcional de hasta 500), guarda los cambios y sube la versión y la fecha de actualización del grupo. Sin migración.
- API: `PATCH /groups/{groupId}` ya figura en el contrato, pero desactualizado. Hay que corregirlo (`docs/api/Groups.md`, `ApiSpecification.md` y `openapi.yaml`) **con tu autorización antes de implementarlo**: cuerpo `{ name, description }` (sin `image`), `200` con el grupo, `400 VALIDATION_ERROR`, `403 PERMISSION_DENIED` y `404 GROUP_NOT_FOUND`. También hay que quitar la frase sobre cambiar la moneda base (según el backlog, la moneda queda fija desde que se crea) y sumar la fila "Editar grupo" (Owner y Administrator) a la matriz de `docs/Security.md`. Pruebas de integración y de contrato.
- PWA: "Editar" en el detalle, solo para Owner y Administrador. Abre una pantalla nueva, `/grupos/:groupId/editar`, con nombre y descripción precargados y la moneda solo como lectura. Al guardar vuelve al detalle; los errores se muestran por campo.
- Documentación: Groups.md, Security.md, UISpecification, CHANGELOG, el checklist de la Fase 1, TODO.md y BACKLOG.md.

## Fuera de alcance
- Cambiar la moneda base: queda fija desde la creación (decisión del backlog).
- La imagen del grupo: todavía no existen imágenes (R2 entra cuando una fase lo necesite).
- `If-Match` / `409 STALE_VERSION`: si dos personas editan a la vez, gana la última, como en las historias anteriores.
- Avisar a los miembros del cambio (notificaciones, Fase 3).
- Editar un grupo archivado (historia #10).

## Sugerencias (tú decides)
- Las dos sugerencias de `/story` quedaron aprobadas e incorporadas al plan:
  - Las reglas de validación de nombre y descripción del dominio se extraen para que las compartan crear y editar el grupo, en vez de escribirlas dos veces.
  - El mapeo de `VALIDATION_ERROR` a mensajes por campo de `GroupsService.createGroup` se extrae para que lo compartan crear y editar, como `rejectionFrom` en la #8.
- Decisión de `/story`: editan el Owner y el Administrator (como ya decían el contrato y UISpecification), no solo el Owner del backlog.

## Decisiones durante `/pair`
