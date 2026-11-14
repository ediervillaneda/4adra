# Changelog

Todos los cambios relevantes de 4adra se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/). Mientras la versión sea `0.x`, cualquier versión menor puede traer cambios incompatibles.

**Cómo se publica una versión:**
1. Se agrega su sección en este archivo.
2. Se sube la versión en `backend/package.json` y `web/package.json`.
3. Se pasa a `main` con un PR desde `release/<versión>`.
4. Se pushea el tag `v<versión>`. `release.yml` crea el GitHub Release con las notas de esta sección.

Ver `docs/Workflows.md`.

## [Sin publicar]

### Agregado
- **Crear un grupo y verlo en Inicio** (pieza 2, historia #1):
  - El grupo lleva nombre, descripción opcional y moneda base, preseleccionada con la del perfil.
  - Quien lo crea queda como Owner.
  - Inicio lista los grupos con su rol y su moneda, y tiene un botón flotante "Crear grupo".
  - API: `POST` y `GET /api/v1/groups`. Base de datos: migración `0003_groups`, con las tablas `groups` y `group_members`.
- **Ver un grupo y sus miembros** (pieza 2, historia #2):
  - Cada grupo de Inicio abre su detalle (`/grupos/:groupId`), con nombre, descripción y moneda base.
  - Lista los miembros activos en orden alfabético, con su foto, su nombre y su rol en español, sin correos.
  - Un grupo inexistente o al que no perteneces muestra "Grupo no encontrado", sin revelar si existe.
  - API: `GET /api/v1/groups/{groupId}` y `GET /api/v1/groups/{groupId}/members`, con `404 GROUP_NOT_FOUND`.
- **Invitar a alguien por correo** (pieza 2, historia #3):
  - Owner y Administrator ven "Invitar" en el detalle del grupo (`/grupos/:groupId/invitar`): correo y rol (Administrador, Miembro o Solo lectura).
  - Solo se invitan correos de la lista de acceso. La invitación queda pendiente 7 días; volver a invitar el mismo correo devuelve la misma.
  - Explica el rechazo cuando el correo no está en la lista o ya es de un miembro.
  - API: `POST /api/v1/groups/{groupId}/members/invitations`, con `403 PERMISSION_DENIED`, `409 MEMBER_ALREADY_ACTIVE` y el código nuevo `422 EMAIL_NOT_ALLOWED`. Base de datos: migración `0004_invitations`.
  - Aún no se puede aceptar ni rechazar (historia #4).
- **Ver, aceptar o rechazar invitaciones** (pieza 2, historia #4):
  - Inicio muestra la sección "Invitaciones" con el grupo, quién invita (sin su correo) y el rol ofrecido; solo las pendientes y vigentes dirigidas a tu correo.
  - Aceptar te suma al grupo con ese rol, y el grupo aparece en "Mis grupos". Si ya eras miembro, la invitación se cierra y tu rol no cambia.
  - Rechazar la quita sin sumarte al grupo.
  - Si la invitación ya venció o ya fue respondida, se quita de Inicio y un aviso explica por qué.
  - API: `GET /api/v1/invitations` y `POST /api/v1/invitations/{invitationId}/accept|decline`, con `404 INVITATION_NOT_FOUND` (también para invitaciones ajenas), `409 INVITATION_EXPIRED` y el código nuevo `409 INVITATION_ALREADY_RESPONDED`. Sin migración: el vencimiento se calcula con `expires_at`.
- **Compartir un enlace de invitación** (pieza 2, historia #5):
  - Owner y Administrator ven "Compartir enlace" en el detalle del grupo. El diálogo crea un enlace válido 7 días para varias personas, con "Copiar" y, en el celular, "Compartir" con la hoja nativa. Crear otro deja sin servir el anterior, y el diálogo lo avisa antes.
  - Quien lo abre ve "Te invitan a «…»" y entra como Miembro con "Unirme". Si ya era miembro, conserva su rol. Un enlace vencido o reemplazado muestra un mensaje claro.
  - El login con Google vuelve al enlace (`?volver=`), solo con rutas del mismo origen.
  - Seguridad: solo se guarda el hash SHA-256 del código, y la auditoría lo enmascara.
  - API: `POST /api/v1/groups/{groupId}/members/invite-link`, `GET /api/v1/invite-links/{code}` y `POST /api/v1/invite-links/{code}/join`, con los códigos nuevos `404 INVITE_LINK_NOT_FOUND` y `409 INVITE_LINK_EXPIRED`. Base de datos: migración `0005_invite_links`.

## [0.2.0] - 2026-11-11

Primera versión en Cloudflare: login con Google, acceso solo por invitación y la PWA base. Producción en `https://4adra.edier.me`.

### Agregado
- **PWA en Angular 22** (ADR-019):
  - Login con Google, y aviso cuando el correo no tiene invitación.
  - Inicio, perfil editable (nombre, moneda, idioma y zona horaria) y política de privacidad.
  - Página 404.
  - Instalable en PC y celular, y abre sin conexión.
- **Diseño adaptable:** barra inferior en celular y barra lateral desde 840 px. Pantalla de carga y avisos de "Sin conexión" y de error, con un código de referencia.
- **Logo definitivo:** monograma "4a" sobre una cuadrícula de 2×2, con los íconos de la PWA (192, 512, maskable y Apple) y el favicon. Ver `docs/brand/`.
- **Acceso solo por invitación:** la lista de correos se mantiene a mano en D1 (ADR-018).
- `PATCH /api/v1/me`: valida cada campo. El perfil nuevo arranca con COP, español y `America/Bogota`.
- **Correo de privacidad** `privacidad@edier.me`, verificación del dominio en Google Search Console y app de Google publicada.
- `CHANGELOG.md` y un workflow de release que se dispara al pushear un tag.

### Cambiado
- **Plataforma:** de Firebase a Cloudflare: un Worker con Hono, D1 (SQLite) y Better Auth con Google (ADR-014 a ADR-016). La app y la API comparten el dominio `4adra.edier.me`.
- **Pruebas:** de Jest a Vitest, con `@cloudflare/vitest-plugin`. La integración corre contra D1 local.
- **Sesión:**
  - La cookie renovada se reenvía al navegador.
  - Los tokens OAuth se guardan cifrados.
  - Sin red o con el servidor caído, la sesión queda "no disponible" en vez de cerrarse.
- **CI:** actions actualizadas a Node 24. El lint de OpenAPI pasó a `backend.yml`, y se quitaron el auto-merge de releases y los tags `-rc`.

### Eliminado
- Firebase, la app Android (ADR-017) y sus workflows.
- El código y los planes obsoletos.

### Corregido
- Los fallos de D1 o de Better Auth responden 500, no 401.
- Los errores de OAuth antes de iniciar sesión vuelven a `/entrar` en vez de mostrar una página en inglés.
- El "Cargando…" ya no se queda fijo en las páginas públicas.

## [0.1.0] - 2026-07-15

Andamiaje de la fase 0, sobre Firebase (reemplazado en 0.2.0).

### Agregado
- **Documentación:** arquitectura, dominio, reglas de negocio, algoritmos, seguridad, API (OpenAPI), UI y ADRs.
- **Backend:** `GET /v1/me` de punta a punta, con pruebas unitarias, de integración y de contrato.
- **Git Flow:** CI de backend y web, más un workflow de release (ADR-013).

[Sin publicar]: https://github.com/ediervillaneda/4adra/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ediervillaneda/4adra/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ediervillaneda/4adra/tree/f47160d634c36aa0c920b2812f4350c1bd0bd9d6
