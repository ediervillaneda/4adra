# Backlog — Pieza 2: grupos y miembros

> Lo escribe `/backlog` y lo actualiza cada historia que se cierra. Se lee antes de cualquier trabajo (ver `CLAUDE.md` § "Flujo de trabajo"). La historia en curso se detalla en `PLAN.md`.

## Contexto
4adra es la PWA para repartir gastos entre personas invitadas. Esta es la pieza 2 de 4 hacia la primera versión funcional: (1) base de la PWA → **(2) grupos y miembros** → (3) gastos y balances → (4) liquidaciones.

Stack: Cloudflare Worker + Hono + D1 + Better Auth (Google), y PWA en Angular 22 (ver `CLAUDE.md`).

Decisiones caras:
- **Roles:** `Owner`, `Administrator`, `Member` y `ReadOnly`. Todo grupo conserva al menos un Owner activo.
- **Varios grupos por persona:** cada grupo es independiente; no hay organizaciones.
- **Moneda:** cada grupo tiene una moneda base, **fija desde que se crea** (no se puede editar).
- **Sin conexión:** la PWA abre sin red, pero no sincroniza cambios hechos offline.
- **Idioma:** solo español.
- **Invitaciones:** solo a correos de la lista de acceso (ADR-018).

## Backlog
1. [x] Como persona invitada a 4adra, quiero crear un grupo y verlo en Inicio, para empezar a compartir gastos.
2. [x] Como miembro, quiero abrir un grupo y ver sus miembros con su rol, para saber quién participa. Requiere: #1
3. [x] Como Owner o Administrator, quiero invitar a alguien por su correo, para sumarlo al grupo. Requiere: #2
4. [x] Como invitado, quiero ver mis invitaciones pendientes y aceptarlas o rechazarlas, para decidir si entro al grupo. Requiere: #3
5. [x] Como Owner o Administrator, quiero compartir un enlace de invitación, para sumar gente sin escribir cada correo. Requiere: #2
6. [ ] Como Owner, quiero cambiar el rol de un miembro, para repartir los permisos. Requiere: #2
7. [ ] Como Owner, quiero remover a un miembro, para sacar a quien ya no participa. Requiere: #2
8. [ ] Como miembro, quiero salir de un grupo, para dejar de verlo. Requiere: #2
9. [ ] Como Owner, quiero editar el nombre y la descripción del grupo, para mantenerlo al día. Requiere: #2
10. [ ] Como Owner, quiero archivar un grupo, para sacarlo de Inicio sin perder sus registros. Requiere: #1

## Notas
- La regla "no se puede salir ni ser removido con balance ≠ 0" entra con los gastos (pieza 3); en esta pieza todo balance es cero.
