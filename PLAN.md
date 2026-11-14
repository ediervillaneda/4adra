# Plan — Historia #5 de `BACKLOG.md`

> Lo escribe `/story` y lo usa `/pair` como entrada. Solo contiene la historia en curso. Al cerrarla, se marca hecha en `BACKLOG.md` y este archivo se reemplaza con la siguiente.

## Historia
Como Owner o Administrator, quiero compartir un enlace de invitación, para sumar gente sin escribir cada correo.

## Criterios de aceptación
- [ ] Dado que soy Owner o Administrator de un grupo, cuando pido el enlace de invitación, entonces veo un enlace que puedo copiar o compartir, válido por 7 días y para varias personas. Si pido uno nuevo, el anterior deja de servir. Si soy Miembro o Solo lectura, no veo la opción, y si igual lo intento por la API recibo "permiso denegado".
- [ ] Dado que tengo acceso a 4adra y abro un enlace vigente, cuando entro con Google (si no tenía sesión) y confirmo "Unirme" en la pantalla que dice a qué grupo me invitan, entonces quedo como Miembro del grupo y lo veo en Inicio. Si ya era miembro activo, entro al grupo sin duplicar mi membresía y sin cambiar mi rol.
- [ ] Dado que el enlace venció, fue reemplazado o no existe, cuando lo abro, entonces veo un mensaje claro y no entro a ningún grupo. Si mi correo no está en la lista de acceso de 4adra, veo "Necesitas una invitación", como hoy.

## Plan
- Base de datos: una migración nueva con los enlaces de cada grupo: el **hash (SHA-256) de un código aleatorio** imposible de adivinar (el código nunca se guarda), quién lo creó, cuándo vence y si fue reemplazado. Un solo enlace vigente por grupo.
- Backend: tres casos de uso, con auditoría. Crear el enlace (solo Owner o Administrator; reemplaza el anterior). Ver a qué grupo invita un enlace (solo el nombre del grupo y si sigue vigente). Unirse con el enlace (crea el perfil si falta, entra como Miembro y no duplica una membresía activa). El chequeo "¿es Owner o Administrator del grupo?", que ya usa invitar por correo, se extrae para compartirlo entre los dos casos de uso.
- API: tres endpoints nuevos, que hay que agregar al contrato (`ApiSpecification.md`, `api/Members.md` y `openapi.yaml`) **con tu autorización antes de implementarlos**: crear el enlace de un grupo, consultar un enlace y unirse con él. Errores: permiso denegado, enlace no encontrado y enlace vencido. Pruebas de integración y de contrato.
- PWA: en el detalle del grupo, para Owner y Administrator, "Compartir enlace" abre un diálogo con el enlace, el botón "Copiar" y, donde el navegador lo permita (celular), el botón "Compartir", que abre la hoja nativa (WhatsApp, Telegram, etc.) sin dependencias nuevas. Una ruta nueva para abrir el enlace, con "Te invitan a «…»" y el botón "Unirme". El login con Google debe volver al enlace, porque hoy siempre regresa a Inicio.
- Documentación: Members.md, DatabaseSchema, UISpecification, CHANGELOG, checklist de la Fase 1, TODO.md y BACKLOG.md.

## Fuera de alcance
- Dar acceso a 4adra con el enlace: la lista de acceso (ADR-018) no cambia.
- Elegir el rol del enlace: siempre se entra como Miembro, y el rol se cambia en la historia #6.
- Anular un enlace sin generar otro, ver quién entró por él o limitar cuántas veces se usa.
- El popup con enlace después de invitar por correo (pedido durante la #4); si se quiere, va como historia aparte.
- Envío por correo y notificaciones (Fase 3).

## Sugerencias (tú decides)
- Las tres sugerencias de `/story` quedaron aprobadas e incorporadas al plan: guardar solo el hash del código, extraer el chequeo de Owner o Administrator y el botón "Compartir" nativo.
