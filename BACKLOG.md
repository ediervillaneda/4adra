# Backlog — Pieza 3: gastos y balances

> Lo escribe `/backlog` y lo actualiza cada historia que se cierra. Se lee antes de cualquier trabajo (ver `CLAUDE.md` § "Flujo de trabajo"). La historia en curso se detalla en `PLAN.md`.

## Contexto
4adra es la PWA para repartir gastos entre personas invitadas. Esta es la pieza 3 de 4 hacia la primera versión funcional: (1) base de la PWA → (2) grupos y miembros → **(3) gastos y balances** → (4) liquidaciones.

Stack: Cloudflare Worker + Hono + D1 + Better Auth (Google), y PWA en Angular 22 (ver `CLAUDE.md`).

Decisiones caras:
- **Moneda:** todo gasto va en la moneda base del grupo, sin conversión. El gasto guarda su código de moneda, para sumar multimoneda en la Fase 2 sin romper el histórico.
- **Permisos (`docs/Security.md`):** Owner, Administrator y Member crean, editan y eliminan cualquier gasto activo del grupo; ReadOnly solo consulta.
- **Sin categorías ni filtros:** la lista de gastos va del más reciente al más antiguo; categorías y filtros llegan en la Fase 3.
- **Dinero:** decimal exacto, nunca `float`. Los balances se recalculan desde gastos y repartos; nunca se editan a mano.
- **Sin conexión:** la PWA abre sin red, pero no sincroniza cambios hechos offline.
- **Idioma:** solo español.

## Backlog
1. [ ] Como miembro, quiero registrar un gasto que pagué, repartido en partes iguales entre todos los miembros, y verlo en la lista del grupo, para llevar la cuenta.
2. [ ] Como miembro, quiero elegir quién pagó y entre quiénes se reparte un gasto, para registrar gastos que pagó otro o que no son de todos. Requiere: #1
3. [ ] Como miembro, quiero ver el balance del grupo (cuánto pagó y consumió cada uno, y a quién le deben o quién debe), para saber cómo vamos. Requiere: #1
4. [ ] Como miembro, quiero abrir un gasto y ver cuánto le toca a cada participante, para entender el reparto. Requiere: #1
5. [ ] Como miembro, quiero repartir un gasto por montos exactos, para cuando cada uno consumió algo distinto. Requiere: #2
6. [ ] Como miembro, quiero repartir un gasto por porcentajes, para acuerdos como "60/40". Requiere: #2
7. [ ] Como miembro, quiero repartir un gasto por partes, para cuando alguien cuenta doble (por ejemplo, una pareja). Requiere: #2
8. [ ] Como miembro, quiero editar un gasto, para corregir un error. Requiere: #4
9. [ ] Como miembro, quiero eliminar un gasto, para quitar uno registrado por error. Requiere: #4
10. [ ] Como miembro, quiero ver los gastos eliminados y restaurarlos, para deshacer un borrado. Requiere: #9
11. [ ] Como miembro, quiero que nadie salga del grupo ni sea removido mientras su balance no esté en cero, para que no se pierdan deudas. Requiere: #3

## Notas
- La pieza 2 (grupos y miembros) se publicó en la versión 0.4.0.
- En un grupo archivado los gastos también son de solo lectura (`409 GROUP_ARCHIVED`), como el resto de sus cambios.
