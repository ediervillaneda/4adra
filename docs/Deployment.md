# Deployment.md

> **Proyecto:** 4adra  
> **Versión:** 2.0  
> **Estado:** Draft

## Objetivo

Define el proceso seguro y repetible para desplegar el Worker `4adra` de Cloudflare (API, autenticación y PWA) y la base D1, con validación, reversión y monitoreo (ADR-014..017).

## Entornos

| Entorno | Cómo corre | URL | Datos |
|---|---|---|---|
| Local | `npm run dev` (`wrangler dev`, D1 local en `.wrangler/`) | `http://localhost:8787` | Sintéticos |
| Preview (opcional) | `wrangler versions upload` desde un PR | `*.workers.dev` | Sintéticos; nunca la D1 de producción |
| Production | `wrangler deploy` desde CI con push a `main` | `https://4adra.edier.me` | Reales, con mínimo privilegio |

Hay un solo entorno remoto (producción), por decisión del responsable del proyecto. No existe staging. Está prohibido usar secretos o datos de producción en local.

## Artefactos desplegables

- **Worker `4adra`:** código (empaquetado por Wrangler desde `backend/src/index.ts`) y configuración (`backend/wrangler.jsonc`).
- **Static Assets:** `backend/public/`, que hoy es un placeholder y luego será el build de la PWA.
- **Base D1:** migraciones de `4adra-db` (`backend/migrations/*.sql`).
- **Secrets del Worker:** `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## Configuración inicial (una sola vez)

1. **Wrangler login:** desde `backend/`, `npx wrangler login` (abre el navegador). Verificar con `npx wrangler whoami`.
2. **Dominio:** la zona `edier.me` debe estar en la misma cuenta de Cloudflare, porque el custom domain `4adra.edier.me` se crea solo en el primer deploy.
3. **Base de datos:**
   - Ejecutar `npx wrangler d1 create 4adra-db`.
   - Copiar el `database_id` que devuelve a `backend/wrangler.jsonc`, en lugar del placeholder `00000000-...`, y hacer commit.
   - Aplicar el esquema con `npm run db:migrate:remote`.
4. **Cliente OAuth de Google** (Google Cloud Console → APIs & Services → Credentials → OAuth client ID, tipo *Web application*):
   - Orígenes autorizados: `https://4adra.edier.me` y `http://localhost:8787`.
   - URIs de redirección: `https://4adra.edier.me/api/auth/callback/google` y `http://localhost:8787/api/auth/callback/google`.
5. **Secrets del Worker** (cada comando pide el valor en la terminal; nunca pegarlo en chats ni archivos versionados):
   ```bash
   npx wrangler secret put BETTER_AUTH_SECRET     # aleatorio de 32 bytes o más (openssl rand -base64 32)
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```
   Para local, los mismos nombres van en `backend/.dev.vars` (copiado de `.dev.vars.example`).
6. **CI:**
   - Crear un API token en Cloudflare con la plantilla "Edit Cloudflare Workers", más el permiso *D1: Edit*, limitado a la cuenta y a la zona `edier.me`.
   - Cargarlo en GitHub con `gh secret set CLOUDFLARE_API_TOKEN` y `gh secret set CLOUDFLARE_ACCOUNT_ID`.
   - Borrar los secrets heredados `FIREBASE_SERVICE_ACCOUNT` y `FIREBASE_PROJECT_ID_PRODUCTION`.
7. **Retiro de Firebase:**
   - Eliminar el proyecto `adra-54655` (y los `-staging`/`-prod`, si existen) en console.firebase.google.com. Sus claves de cliente siguen en el historial de git, y eliminar el proyecto las inutiliza.
   - Es una acción manual del responsable del proyecto.

## Lista de acceso (ADR-018)

Solo los correos inscritos pueden crear una cuenta. Para inscribir, revocar o consultar, se ejecuta desde `backend/` contra producción. No hace falta redeploy y los correos no van al repositorio:

```bash
# Inscribir (el correo SIEMPRE en minúsculas)
npx wrangler d1 execute 4adra-db --remote --command "INSERT INTO allowed_emails (email, note, created_at) VALUES ('persona@gmail.com', 'Nombre', strftime('%Y-%m-%dT%H:%M:%fZ','now'))"

# Revocar (impide registrarse; no expulsa a un usuario ya creado)
npx wrangler d1 execute 4adra-db --remote --command "UPDATE allowed_emails SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email = 'persona@gmail.com'"

# Bloquear a un usuario ya registrado
npx wrangler d1 execute 4adra-db --remote --command "UPDATE users SET status = 'DISABLED' WHERE email = 'persona@gmail.com'"

# Consultar
npx wrangler d1 execute 4adra-db --remote --command "SELECT email, note, created_at, revoked_at FROM allowed_emails"
```

## Requisitos previos de cada despliegue

- **Control de cambios:** versión identificable, cambios revisados por PR y CI en verde (formato, lint, tipos, unitarias, migraciones en limpio, integración, contrato, `npm audit` y build).
- **Datos:** si hay migración nueva, debe ser aditiva y compatible con el código anterior.
- **Plan de reversión:** documentado.

Los cambios de API, perfil de cálculo, esquema o seguridad necesitan prueba de compatibilidad y aprobación explícita.

## Pipeline

```text
PR → backend.yml: formato → lint → tipos → unitarias+cobertura → migraciones D1 (local)
   → integración (runtime Workers + D1 local) → contrato (OpenAPI) → npm audit → build (dry-run)
release/* → release.yml: CI completo → PR automático a main y develop → tag v<versión>
push a main → deploy-cloudflare.yml: npm ci → d1 migrations apply --remote → wrangler deploy
```

El deploy usa solo el API token de alcance mínimo guardado en los secrets de GitHub. Nunca se usan credenciales personales ni se imprimen variables en los logs.

## Despliegue del backend

1. **Orden:** las migraciones se aplican **antes** del código que las necesita; el workflow ya lo hace en ese orden.
2. **Publicación:** `wrangler deploy` publica una versión nueva de forma atómica. Cloudflare conserva las versiones anteriores.
3. **Prueba de humo:**
   - `GET /` → HTML de la PWA.
   - `GET /api/v1/me` sin sesión → `401` JSON.
   - Login con Google → `GET /api/v1/me` → `200`.
4. **Revisión:** errores, latencia y logs en el dashboard (Workers → `4adra` → Observability).

No hacer borrados destructivos ni cambios de esquema que rompan la versión anterior sin un periodo de transición.

## PWA

- **Publicación:**
  - `assets.directory` de `backend/wrangler.jsonc` apunta a `../web/dist/web/browser`.
  - `deploy-cloudflare.yml` compila `web/` (`npm ci && npm run build`) antes de migrar y desplegar el Worker.
  - Desplegar a mano: `cd web && npm run build`, y después `cd ../backend && npx wrangler deploy`.
  - No hay configuración por entorno, porque la API está en el mismo origen.
- **Service worker:** al desplegar una versión nueva, la PWA instalada la descarga en segundo plano y la usa en la siguiente apertura. `/api/*` nunca se cachea.
- **Prueba de humo:**
  - `/`, `/perfil` y `/privacidad` → HTML de la SPA (200).
  - `/manifest.webmanifest` y `/ngsw.json` → 200.
  - `/api/v1/me` → 401 JSON.
  - `/api/nope` → 404 JSON.
  - Login con Google, perfil e instalación en el celular.

## Correo de privacidad y publicación de la app de Google

1. **Alias `privacidad@edier.me`:** Cloudflare → `edier.me` → Email → Email Routing. Se crea la regla `privacidad@edier.me` → correo del responsable y se verifica el destino. La política de privacidad (`/privacidad`) publica este alias.
2. **Google Search Console:** se agrega la propiedad de dominio `edier.me` y se verifica con el registro TXT que indica Google, creado en el DNS de Cloudflare.
3. **Google Auth Platform (proyecto `adra-app`) → Información de la marca:**
   - Página principal: `https://4adra.edier.me`.
   - Política de privacidad: `https://4adra.edier.me/privacidad`.
   - Dominio autorizado: `edier.me`.
   - Logo: `web/public/icons/icon-512.png`.
4. **Público → Publicar app.** A partir de ahí no hacen falta usuarios de prueba en Google: la lista de acceso del Worker (ADR-018) sigue decidiendo quién puede crear cuenta.

## Migraciones y perfiles de cálculo

- **Forma de las migraciones:** son archivos SQL numerados. Deben ser aditivas y no editarse nunca una vez aplicadas; para corregir, se crea otra.
- **Cambios masivos:** antes, exportar la base con `npx wrangler d1 export 4adra-db --remote --output backup.sql`. D1 también ofrece Time Travel (restauración a un punto en el tiempo, `wrangler d1 time-travel`).
- **Importes históricos:** nunca se reescriben.

Una estrategia o `CalculationProfile` publicado es inmutable. Para cambiar el comportamiento, se publica una versión nueva, se activa solo para cálculos futuros y se verifica con pruebas doradas que los gastos previos mantienen resultados reproducibles.

## Reversión e incidentes

- **Código:** `npx wrangler rollback` vuelve a la versión anterior del Worker. `npx wrangler deployments list` muestra el historial.
- **Datos financieros:** nunca se revierten borrando. Si una mutación ya se confirmó, se usa una operación compensatoria auditada.
- **Base completa:** solo como último recurso, `wrangler d1 time-travel restore`, con registro en `Decisions.md`.

**Ante un incidente:**
1. Contener: rotar el secreto afectado o hacer rollback.
2. Pausar los merges a `main`.
3. Preservar logs y auditoría.
4. Evaluar el impacto.
5. Comunicar y documentar las acciones correctivas.

## Verificación posterior

- Salud del Worker: tasa de errores, latencia, CPU y cuotas de D1.
- Autenticación (cookie de sesión) y autorización por rol.
- Creación de gasto, cálculo de balance y confirmación de liquidación, cuando existan.
- Auditoría (`audit_logs`) escribiéndose en las mutaciones.
- Confirmación de que no se publicaron secretos ni datos de prueba.

Registrar en el registro de despliegue la versión (tag `v<versión>` y version ID de Wrangler), la hora, el responsable, el resultado de la prueba de humo, las migraciones aplicadas y la decisión de avanzar o revertir.
