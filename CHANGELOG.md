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
[0.1.0]: https://github.com/ediervillaneda/4adra/releases/tag/v0.1.0
