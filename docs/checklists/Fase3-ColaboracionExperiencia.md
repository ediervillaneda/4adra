# Fase 3 — Colaboración y experiencia

> Checklist operativo de `docs/Roadmap.md` Fase 3.

## Objetivo

Facilitar el uso cotidiano entre participantes: adjuntos, comentarios, notificaciones, filtros/búsqueda, dashboard, offline limitado y accesibilidad/localización.

## Prerrequisitos

- [ ] Fase 1 (MVP) en producción con datos reales o de staging representativos.

## Checklist

### Especificación previa (esta fase tiene los mayores vacíos de especificación detectados)

- [ ] **Comentarios**: hoy solo mencionados en `docs/BusinessRules.md` como capacidad planificada. Antes de programar, definir y documentar en el mismo cambio: entidad `Comment` en `docs/DomainModel.md` y `docs/AGENTS.md` (añadirla al catálogo de entidades permitidas), colección `comments/` en `docs/DatabaseSchema.md`, endpoints en un nuevo `docs/api/Comments.md` y en `docs/api/openapi.yaml`, y quién puede comentar/editar/eliminar un comentario (`docs/Security.md`).
- [ ] **Notificaciones**: la entidad y colección `notifications/{id}` ya existen (`docs/DomainModel.md`, `docs/DatabaseSchema.md`), pero no hay endpoints de cliente. Especificar `GET /notifications`, marcado de lectura, paginación y la integración con Firebase Cloud Messaging (tokens, tópicos) en un nuevo `docs/api/Notifications.md` antes de implementar.
- [ ] **Offline limitado**: definir qué operaciones son válidas sin conexión, cómo se resuelven conflictos al reconectar (¿last-write-wins? ¿bloqueo optimista con `resourceVersion`?) — no está decidido en ningún documento hoy.
- [ ] **Localización**: confirmar idiomas soportados al lanzar esta fase (hoy solo se menciona `language` como campo BCP 47 sin lista concreta).

### Backend

- [ ] Endpoints y casos de uso de adjuntos ya cubiertos en Fase 1 (`upload-url`, eliminar) — validar límites reales (10 MB, 5 por gasto, tipos permitidos — ADR-011) en producción.
- [ ] Casos de uso de comentarios (una vez especificados arriba).
- [ ] Envío de notificaciones vía FCM para: invitaciones, gastos, liquidaciones, cambios de rol, archivado (`docs/domain/Events.md`).
- [ ] Filtros de búsqueda de gastos ya cubiertos parcialmente en `GET /groups/{groupId}/expenses` (Fase 1); ampliar si el dashboard requiere agregaciones nuevas.

### Android y Web

- [ ] Construir las pantallas listadas en `docs/UISpecification.md` § "Fase 3 — Colaboración y experiencia" (varias siguen marcadas "pendiente de especificar backend" ahí mismo — resolver esa especificación primero, ver más arriba).
- [ ] Visor/subida de adjuntos por gasto.
- [ ] Hilo de comentarios por gasto (una vez especificado el backend).
- [ ] Centro de notificaciones in-app + push.
- [ ] Filtros y búsqueda de gastos, categorías configurables en la UI (el catálogo sigue siendo global — ver `docs/BusinessRules.md`).
- [ ] Dashboard de grupo (resumen por categoría/periodo, reutilizando datos de Fase 1/2, sin nuevo cálculo en cliente).
- [ ] Accesibilidad básica (lectores de pantalla, contraste, tamaños de fuente) y formatos regionales de fecha/moneda.
- [ ] Estado offline limitado según lo definido arriba, con resolución explícita de conflictos visible al usuario.

### Pruebas

- [ ] Notificaciones auditables: cada notificación enviada queda trazada a un evento de dominio.
- [ ] Acceso a adjuntos protegido: un usuario fuera del grupo no puede obtener una URL firmada válida.
- [ ] Pruebas de accesibilidad básica en Web (Angular TestBed) y Android (Compose UI Test).

## Criterios de salida

- [ ] Notificaciones auditables.
- [ ] Acceso a adjuntos protegido.
- [ ] Flujos principales (gasto, balance, liquidación, comentarios, notificaciones) accesibles en Android y Web.

## Documentos relacionados

`docs/Roadmap.md` (Fase 3), `docs/domain/Events.md`, `docs/Security.md`, `docs/BusinessRules.md`, `docs/api/Expenses.md`, `docs/DatabaseSchema.md`.
