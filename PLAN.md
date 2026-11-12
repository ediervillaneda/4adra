# Plan — Historia #2 de `BACKLOG.md` (cerrada el 2026-11-12)

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como miembro, quiero abrir un grupo y ver sus miembros con su rol, para saber quién participa.

## Criterios de aceptación
- [x] Dado que soy miembro activo de un grupo, cuando lo toco en Inicio, entonces veo su nombre, su descripción y su moneda base, y la lista de sus miembros activos en orden alfabético por nombre, con nombre, foto y rol en español (Propietario, Administrador, Miembro, Solo lectura), sin correos.
- [x] Dado que acabo de crear un grupo, cuando lo abro, entonces aparezco como su único miembro, con el rol Propietario.
- [x] Dado que el grupo no existe o no soy miembro, cuando abro su dirección, entonces veo "Grupo no encontrado", sin pistas de si el grupo existe.

## Plan
- Backend: un caso de uso que devuelve el grupo y sus miembros activos (ordenados alfabéticamente por nombre) solo si el actor tiene una membresía activa; si no, responde "grupo no encontrado" (404 `GROUP_NOT_FOUND`).
- API: implementar `GET /groups/{groupId}` y `GET /groups/{groupId}/members` tal como ya están en el contrato, con pruebas de integración y de contrato.
- PWA: la ruta del detalle del grupo, con cada grupo de Inicio enlazado a ella, y la pantalla con los datos del grupo y la lista de miembros, con los estados de carga, contenido y error.
- Textos y nombres de los roles en `texts.ts`.
- Documentación: Groups.md, Members.md, UISpecification, CHANGELOG, checklist de la Fase 1 y BACKLOG.md.

## Fuera de alcance
- Las pestañas Gastos, Balances y Liquidaciones del detalle del grupo (solo existe la parte de miembros).
- Invitar, cambiar rol, remover, salir, editar y archivar (historias #3 a #10).
- Paginación de miembros (el límite de 100 alcanza de sobra).
- Grupos archivados y miembros removidos.

## Sugerencias (tú decides)
- La etiqueta de rol que ya muestra Inicio es la misma que usará la lista de miembros. Si en Inicio está escrita a mano, conviene sacar una sola traducción de roles para las dos pantallas.
- Si dos miembros tienen el mismo nombre, desempatar por `userId` para que el orden sea siempre el mismo (las pruebas deben ser deterministas).
