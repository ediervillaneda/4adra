# Workflows.md

> **Proyecto:** 4adra
> **Versión:** 1.0
> **Estado:** Active

## Objetivo

Guía operativa de los workflows de GitHub Actions (`.github/workflows/`) y del flujo de ramas Git Flow (ADR-013, `docs/Decisions.md`). Cada sección incluye los comandos equivalentes para reproducir el paso en local, antes de empujar nada a GitHub.

## Modelo de ramas

```text
main        (producción; solo recibe PRs desde release/* o hotfix/*; cada versión lleva tag vX.Y.Z)
  ^
develop     (integración continua, recibe merges desde feature/* vía PR)
  ^
feature/*   (una rama por tarea/funcionalidad)
```

`release/*` se corta de `develop` cuando un conjunto de features está listo para publicar. `hotfix/*` se corta de `main` para una corrección urgente. `main` y `develop` tienen branch protection: bloquean push directo, force-push y borrado — todo cambio entra vía Pull Request.

### Paso a paso: nueva funcionalidad

```bash
git checkout develop
git pull
git checkout -b feature/mi-funcionalidad

# ... trabajo, commits ...

git push -u origin feature/mi-funcionalidad
gh pr create --base develop --head feature/mi-funcionalidad \
  --title "feat: mi funcionalidad" --body "Descripción del cambio"

# Cuando el CI pase y esté aprobado:
gh pr merge <numero> --merge
git branch -d feature/mi-funcionalidad   # limpieza local
```

### Paso a paso: publicar una versión

```bash
git checkout develop && git pull
git checkout -b release/1.2.0

# 1. CHANGELOG.md: mover lo de [Sin publicar] a una sección "## [1.2.0] - AAAA-MM-DD".
# 2. Subir la versión en los dos paquetes:
(cd backend && npm version 1.2.0 --no-git-tag-version)
(cd web && npm version 1.2.0 --no-git-tag-version)
git commit -am "chore(release): 1.2.0"
git push -u origin release/1.2.0

# 3. PR hacia main. Al mergear, deploy-cloudflare.yml publica a producción.
gh pr create --base main --head release/1.2.0 --title "release: 1.2.0" --body "Ver CHANGELOG.md"
gh pr merge <numero> --merge

# 4. Tag sobre main. release.yml crea el GitHub Release con las notas del CHANGELOG.
git fetch origin main
git tag -a v1.2.0 origin/main -m "Release 1.2.0"
git push origin v1.2.0

# 5. Llevar main de vuelta a develop.
gh pr create --base develop --head release/1.2.0 --title "chore: sincronizar develop tras 1.2.0"
gh pr merge <numero> --merge
git branch -d release/1.2.0 && git push origin --delete release/1.2.0
```

### Paso a paso: hotfix urgente

Igual que una versión, con un aumento de *patch* (1.2.1), pero la rama se corta de `main`:

```bash
git checkout -b hotfix/1.2.1 origin/main
# ... fix, CHANGELOG.md y npm version 1.2.1 en backend/ y web/ ...
git push -u origin hotfix/1.2.1
# Luego los pasos 3 a 5 de "publicar una versión", con hotfix/1.2.1.
```

## Workflows

### `backend.yml` — Backend CI

Dispara en: cualquier `pull_request` (sin filtro de carpetas) y push a `develop` que toque `backend/**` o `docs/api/openapi.yaml`. No corre con el push a `main` que deja el merge: el PR ya lo validó y `deploy-cloudflare.yml` hace su propio build. Un solo job secuencial. Incluye el lint del contrato OpenAPI, que antes estaba en `openapi-lint.yml`.

Pasos y su comando equivalente en local:

```bash
cd backend
npm ci
npm run format:check      # Prettier
npm run lint               # ESLint estricto
npm run typecheck          # tsc --noEmit
npm test                   # Vitest unitarias + umbrales de cobertura (domain 100, application 95, presentation 70)
npm run db:migrate:local   # migraciones D1 en limpio (D1 local de Wrangler)
npm run test:integration   # runtime de Workers + D1 local (sin JDK ni emuladores)
npm run test:contract      # contra docs/api/openapi.yaml
npx --yes @redocly/cli@2.77.0 lint ../docs/api/openapi.yaml
npm audit --omit=dev --audit-level=high
npm run build              # wrangler deploy --dry-run --outdir dist
```

### `web.yml` — Web CI

Dispara igual que `backend.yml` pero sobre `web/**`. La PWA (ADR-019) también se compila en `backend.yml` (para el dry-run) y en `deploy-cloudflare.yml`.

```bash
cd web
npm ci
npm run lint
npm test                   # Vitest + cobertura (umbral 70 %)
npm audit --omit=dev --audit-level=high
npm run build              # web/dist/web/browser (assets del Worker)
```

### `main-pr-source.yml` — Rama de origen

Dispara en los `pull_request` hacia `main`. Falla si la rama del PR no es `release/*` ni `hotfix/*`, así que solo entran a producción versiones y hotfixes (Git Flow). No hace checkout ni usa secrets.

### `release.yml` — Release

Dispara al pushear un tag `vX.Y.Z`. Antes de crear el GitHub Release, comprueba tres cosas:
- que el tag apunta a un commit de `main`;
- que `backend/package.json` y `web/package.json` tienen esa versión;
- que `CHANGELOG.md` tiene la sección `## [X.Y.Z]`.

Las notas del Release salen de esa sección. No despliega nada: el deploy ya ocurrió al mergear el PR a `main`.

```bash
# Ver localmente las notas que publicará:
awk -v v="1.2.0" 'index($0, "## [" v "]") == 1 { f = 1; next } f && /^## \[/ { exit } f && /^\[[^]]+\]: / { exit } f' CHANGELOG.md
```

### `deploy-cloudflare.yml` — Deploy Cloudflare (Production)

Dispara únicamente con push a `main` que toque `backend/**`, `web/**` o el propio workflow. Compila la PWA, aplica las migraciones de D1 **antes** de publicar el código y despliega el Worker. Requiere los secrets `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`; si faltan, el job falla.

```bash
cd backend
npm ci
export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...   # en CI vienen de los secrets
npm run db:migrate:remote      # wrangler d1 migrations apply 4adra-db --remote
npx wrangler deploy            # publica el Worker 4adra en https://4adra.edier.me
```

Revertir: `npx wrangler rollback` (ver `docs/Deployment.md`).

## Secrets requeridos

| Secret | Usado por | Estado |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | `deploy-cloudflare.yml` | Cargado. Token con plantilla "Edit Cloudflare Workers" + D1 Edit, limitado a la cuenta y a la zona `edier.me` (`docs/Deployment.md`) |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-cloudflare.yml` | Cargado |


## Protección de ramas

| Regla | `main` | `develop` |
|---|---|---|
| Solo por Pull Request (sin push directo, force-push ni borrado) | Sí | Sí |
| Checks obligatorios `Backend CI` y `Web CI` en verde | Sí | No (corren, pero no bloquean) |
| Check obligatorio `Rama de origen` (solo `release/*` o `hotfix/*`) | Sí | No aplica |
| Rama del PR al día con la base (*strict*) | Sí | No |
| Aplica también a administradores | Sí | Sí |

Por eso el deploy a producción (`deploy-cloudflare.yml`) solo ocurre al mergear un PR a `main` con todas las pruebas en verde. En los PR, `backend.yml` y `web.yml` corren siempre, sin filtro de carpetas, para que los checks obligatorios nunca queden esperando.

```bash
# Ver la protección actual de main:
gh api repos/ediervillaneda/4adra/branches/main/protection --jq .required_status_checks
```

## Permisos de repositorio

Ningún workflow abre ni mergea PRs. `release.yml` declara `contents: write` para crear el Release, y el resto solo lee.

## Documentos relacionados

`docs/Decisions.md` (ADR-013), `docs/DevelopmentGuide.md` (sección "Modelo de ramas"), `docs/Deployment.md`, `docs/checklists/Fase0-FundacionTecnica.md`.
