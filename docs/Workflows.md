# Workflows.md

> **Proyecto:** 4adra
> **Versión:** 1.0
> **Estado:** Active

## Objetivo

Guía operativa de los workflows de GitHub Actions (`.github/workflows/`) y del flujo de ramas Git Flow (ADR-013, `docs/Decisions.md`). Cada sección incluye los comandos equivalentes para reproducir el paso en local, antes de empujar nada a GitHub.

## Modelo de ramas

```text
main        (producción, solo merges automáticos desde release/*|hotfix/*)
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

### Paso a paso: cortar una release

```bash
git checkout -b release/1.2.0 origin/main    # se corta desde main, no desde develop
git push -u origin release/1.2.0

gh pr create --base release/1.2.0 --head develop \
  --title "release: 1.2.0" \
  --body "Contenido de esta release: ..."

# Al mergear este PR, el push resultante a release/1.2.0 dispara release.yml:
# corre CI completo y, si pasa, publica automáticamente a main + develop.
gh pr merge <numero> --merge
```

### Paso a paso: hotfix urgente

```bash
git checkout -b hotfix/fix-critico origin/main
# ... commit del fix ...
git push -u origin hotfix/fix-critico
# El push dispara release.yml igual que una release: CI + merge automático a main/develop + tag.
```

### Paso a paso: fix de estabilización sobre una release ya cortada

```bash
git checkout -b fix/algo release/1.2.0
# ... commit ...
git push -u origin fix/algo
gh pr create --base release/1.2.0 --head fix/algo --title "fix: algo"
gh pr merge <numero> --merge
# Al mergear, se crea el tag v1.2.0-rc + GitHub Release (prerelease). No dispara deploy.
```

## Workflows

### `backend.yml` — Backend CI

Dispara en: push a `main`/`develop` (paths `backend/**`), cualquier `pull_request` (paths `backend/**`), y `workflow_call` (reusado por `release.yml`). Un solo job secuencial; se omite sin fallar si `backend/package.json` no existe todavía.

Pasos y su comando equivalente en local:

```bash
cd backend
npm ci
npm run format:check      # Prettier
npm run lint               # ESLint estricto
npm run typecheck          # tsc --noEmit
npm test -- --coverage     # Jest unitarias, 100%/95% cobertura domain/application

# Integración (requiere Firebase Emulator Suite + JDK 21+):
cd ..
firebase emulators:exec --project demo-4adra --only auth,firestore,storage \
  "npm --prefix backend run test:integration"

# Contrato contra docs/api/openapi.yaml:
npm --prefix backend run test:contract

cd backend
npm audit --omit=dev --audit-level=high
npm run build
```

### `web.yml` — Web CI

Dispara igual que `backend.yml` pero sobre `web/**`. Se omite mientras `web/package.json` no exista.

```bash
cd web
npm ci
npm run lint
npm test -- --watch=false --browsers=ChromeHeadless --code-coverage
npm audit --omit=dev --audit-level=high
npm run build -- --configuration=production
```

### `android.yml` — Android CI

Dispara igual, sobre `android/**`. Se omite mientras `android/gradlew` no exista. El job `instrumented-tests` (emulador Android) solo corre en push, no en cada PR (es lento).

```bash
cd android
./gradlew lint ktlintCheck detekt
./gradlew test
./gradlew build

# Instrumentadas (requiere emulador/dispositivo conectado, o CI con KVM):
./gradlew connectedAndroidTest
```

### `release.yml` — Release (ciclo de vida completo)

Dos triggers en un solo archivo:

1. **`push` a `release/**`/`hotfix/**`** → corre `backend.yml`/`web.yml`/`android.yml` como reusables. Si pasan y hay commits nuevos vs `main` (guard: rama recién cortada no dispara nada), abre y mergea PR real hacia `main` (nunca push directo), taguea `v<version>`, crea GitHub Release, y sincroniza `develop` con otro PR.
2. **`pull_request` cerrado/mergeado hacia `release/**`** (fixes de estabilización) → taguea `v<version>-rc` y crea GitHub Release marcado `prerelease`. No repite tests.

Reproducir el guard de "commits nuevos" en local:

```bash
git fetch origin main
git rev-list --count origin/main..HEAD    # 0 = rama recién cortada, no publica
```

Reproducir la publicación manualmente (si tuvieras que hacerlo a mano):

```bash
gh pr create --base main --head release/1.2.0 --title "release: 1.2.0"
gh pr merge release/1.2.0 --merge
git tag -a v1.2.0 origin/main -m "Release 1.2.0"
git push origin v1.2.0
gh pr create --base develop --head release/1.2.0 --title "chore: sincronizar develop"
gh pr merge release/1.2.0 --merge
```

### `deploy-firebase.yml` — Deploy Firebase (Production)

Dispara únicamente con push a `main` (paths `backend/**`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`). Requiere los secrets `FIREBASE_SERVICE_ACCOUNT` y `FIREBASE_PROJECT_ID_PRODUCTION` — se omite sin fallar si no existen.

```bash
cd backend
npm ci
npm run build
npm install -g firebase-tools
firebase deploy --only functions,firestore:rules,firestore:indexes,storage \
  --project <FIREBASE_PROJECT_ID_PRODUCTION> --non-interactive
```

### `firebase-config.yml` — Firebase Config Validation

Valida `firebase.json`/`firestore.indexes.json` (JSON) y `firestore.rules`/`storage.rules` (arrancando el Emulator Suite). Corre siempre, no depende de scaffolding.

```bash
python3 -c "import json; json.load(open('firebase.json'))"
python3 -c "import json; json.load(open('firestore.indexes.json'))"

npm install -g firebase-tools
firebase emulators:exec --project demo-4adra --only firestore,storage \
  "echo ok"
```

### `openapi-lint.yml` — OpenAPI Contract Lint

Valida `docs/api/openapi.yaml` con Redocly. Corre siempre.

```bash
npx --yes @redocly/cli@latest lint docs/api/openapi.yaml
```

## Secrets requeridos

| Secret | Usado por | Estado |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | `deploy-firebase.yml` | Configurado, apunta a `adra-54655` (un solo entorno, ver ADR-013) |
| `FIREBASE_PROJECT_ID_PRODUCTION` | `deploy-firebase.yml` | Configurado, `adra-54655` |

La cuenta de facturación de Google Cloud está cerrada — el deploy de Cloud Functions (plan Blaze) fallará hasta reactivarla; Firestore/Storage rules sí deberían poder desplegarse igual.

## Permisos de repositorio requeridos

`release.yml` abre y mergea Pull Requests automáticamente — requiere **"Allow GitHub Actions to create and approve pull requests"** habilitado:

```bash
gh api -X PUT repos/<owner>/<repo>/actions/permissions/workflow \
  -H "Accept: application/vnd.github+json" \
  -f default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=true
```

## Documentos relacionados

`docs/Decisions.md` (ADR-013), `docs/DevelopmentGuide.md` (sección "Modelo de ramas"), `docs/Deployment.md`, `docs/checklists/Fase0-FundacionTecnica.md`.
