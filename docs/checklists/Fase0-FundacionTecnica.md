# Fase 0 — Fundación técnica

> Checklist operativo de `docs/Roadmap.md` Fase 0. Marca cada casilla al completarla; si el alcance cambia, ajusta este archivo en el mismo cambio (regla de mantenimiento de `docs/TODO.md`).

## Objetivo

Disponer de una base segura y repetible para desarrollo: repositorio, entornos, CI, Firebase Auth/Emulator, Clean Architecture escaleteada, inyección de dependencias, manejo de errores y auditoría base.

## Prerrequisitos

- [x] Documentación de dominio y arquitectura completa (`docs/AGENTS.md`, `docs/Architecture.md`, `docs/DomainModel.md`, `docs/DatabaseSchema.md`, `docs/BusinessRules.md`, `docs/Algorithms.md`, `docs/Security.md`).
- [x] Decisiones de stack registradas (`docs/Decisions.md`: ADR-008 stack, ADR-009 acceso a Firestore/Storage, ADR-010 IDs deterministas, ADR-011 límites operativos).
- [x] Artefactos de configuración Firebase iniciales: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `.firebaserc.example`.
- [x] Contrato HTTP machine-readable inicial: `docs/api/openapi.yaml`.

## Checklist

### Repositorio y entornos

- [x] ADR-008 confirmado: GitHub + GitHub Actions, carpetas independientes sin herramienta de monorepo, npm, Node.js "LTS vigente" (número exacto pendiente de fijar al hacer el scaffolding real).
- [x] Repositorio remoto creado y conectado: `https://github.com/ediervillaneda/4adra`.
- [x] Workflows de GitHub Actions creados (`.github/workflows/backend.yml`, `web.yml`, `android.yml`) según el pipeline de `docs/Deployment.md`. Cada uno comprueba si existe scaffolding real (`package.json`/`gradlew`) y si no, se omite sin fallar — no bloquean CI mientras las carpetas solo tengan el `README.md` placeholder. Bonus, ya activos hoy sin scaffolding: `openapi-lint.yml` (valida `docs/api/openapi.yaml` con Redocly, verificado localmente con exit 0) y `firebase-config.yml` (valida `firebase.json`/`firestore.indexes.json` como JSON y `firestore.rules`/`storage.rules` arrancando el Emulator Suite con un proyecto demo).
- [x] Cuando se cree `backend/package.json`, definir los scripts npm que `backend.yml` ya asume: `format:check`, `lint`, `typecheck`, `test` (con `--coverage`), `test:integration` (pensado para correr dentro de `firebase emulators:exec`), `test:contract` (contra `docs/api/openapi.yaml`), `build`.
- [ ] Cuando se cree `web/package.json`, definir los scripts que `web.yml` ya asume: `lint`, `test` (Karma/Jest headless), `build`.
- [ ] Cuando se cree el proyecto Android, confirmar que existen las tareas Gradle que `android.yml` ya asume: `lint`, `ktlintCheck`, `detekt`, `test`, `build`, `connectedAndroidTest`.
- [x] `backend/.nvmrc` confirmado contra nodejs.org: Node 24 (Active LTS al 2026-07-14) (ADR-008 deja el criterio, no el número).
- [ ] `web/.nvmrc`: confirmar LTS activa vigente contra nodejs.org al crear el scaffolding de `web/` (fuera de alcance de este plan).
- [x] Proyecto Firebase `development` creado en Firebase Console: `adra-54655` (config de cliente Web ya guardada en `web/src/environments/environment.ts`). Reflejado en `.firebaserc.example`.
- [ ] Restringir la API key de `adra-54655` en Google Cloud Console (Credentials → Application restrictions → HTTP referrers) al dominio real de la Web una vez se despliegue; hoy no tiene restricción.
- [ ] Copiar `.firebaserc.example` a `.firebaserc` (real, ignorado por git) apuntando a `adra-54655` para poder desplegar `firestore.rules`/`storage.rules`/`firestore.indexes.json` (tarea ya listada arriba).
- [ ] Crear los proyectos Firebase `staging` y `production` (separados de `adra-54655`) cuando corresponda, y sus respectivos `environment.staging.ts`/`environment.production.ts` en `web/`. **Estado temporal (2026-07-15):** `deploy-firebase.yml`/`release-branch.yml` ya tienen secrets cargados (`FIREBASE_SERVICE_ACCOUNT[_STAGING]`, `FIREBASE_PROJECT_ID_STAGING`/`_PRODUCTION`) pero **ambos apuntan a `adra-54655`** — decisión explícita para desbloquear el pipeline antes de crear los proyectos reales. Viola la separación de entornos de `docs/Deployment.md`; reemplazar por proyectos reales antes de manejar datos de usuarios reales. Además, la cuenta de facturación de Google Cloud está cerrada (`gcloud billing accounts list` → `OPEN: False`) — Cloud Functions v2 (plan Blaze) no desplegará hasta reactivarla, aunque Firestore/Storage rules sí podrían.
- [x] Confirmado: "Cuadra" no es un cambio de marca, fue una inconsistencia al registrar la app — el nombre correcto es `com.edier.adra.app` (ADR-012).
- [x] App Android re-registrada en Firebase con `applicationId` = `com.edier.adra.app` y `android/app/google-services.json` reemplazado por el correcto.
- [ ] Opcional: eliminar de Firebase Console el registro Android duplicado `com.edier.cuadra.app`.
- [ ] Restringir la API key de Android en Google Cloud Console a `com.edier.adra.app` + SHA-1 del certificado de firma, antes de publicar (ver `android/README.md`).
- [ ] Borrar `android/google-services.json` (copia vieja en la raíz, superada por `android/app/google-services.json`).
- [ ] Crear los tres proyectos Firebase (development, staging, production) descritos en `docs/Deployment.md`, cada uno con Auth, Firestore, Storage y Cloud Messaging habilitados.
- [ ] Definir plantillas de variables de entorno sin secretos (`.env.example` por plataforma) según `docs/DevelopmentGuide.md`.

### Backend (`backend/`)

- [x] Inicializar proyecto Node.js/TypeScript con `strict: true` (`docs/CodingStandards.md`).
- [x] Crear estructura de carpetas `backend/src/{domain,application,infrastructure,presentation}` (`docs/DevelopmentGuide.md`).
- [x] Configurar ESLint + Prettier según `docs/CodingStandards.md`.
- [x] Configurar Jest para pruebas unitarias e integración con Firebase Emulator.
- [x] Fijar versión de Node en `backend/.nvmrc` y `engines.node` de `package.json`.
- [x] Implementar el primer caso de uso trivial (por ejemplo `GET /me` de `docs/api/Auth.md`) de punta a punta, atravesando las cuatro capas, como prueba de que la arquitectura funciona antes de escalar a más funcionalidad.
- [x] Configurar inyección de dependencias (contenedor o composición manual) sin instancias concretas dentro de casos de uso.
- [x] Manejo de errores: excepciones de dominio específicas (`docs/CodingStandards.md`) traducidas a HTTP solo en Presentation, con el sobre de error de `docs/ApiSpecification.md`.
- [x] Auditoría base: escritura de `auditLogs` desde un middleware/decorador común, no repetida por caso de uso.

### Web (`web/`)

- [ ] Inicializar proyecto Angular con Angular Material y RxJS (`docs/AGENTS.md`).
- [ ] Configurar ESLint (Angular) y estructura por funcionalidad (`docs/CodingStandards.md`).
- [ ] Cliente HTTP tipado apuntando a `docs/api/openapi.yaml` (generar tipos o usarlo como referencia de contrato).

### Android (`android/`)

- [ ] **Crear el proyecto en Android Studio** (no a mano — genera correctamente `gradlew`/`gradle-wrapper.jar` y fija versiones de Gradle/AGP compatibles entre sí):
  - New Project → **Empty Activity** (plantilla Jetpack Compose, según `AGENTS.md`/ADR-008).
  - **Package name:** `com.edier.adra.app` — debe coincidir exactamente con `android/app/google-services.json` (ADR-012), si no, Firebase no reconoce la app.
  - **Save location:** la carpeta `android/` de este repo (no una carpeta nueva aparte), para que el módulo `app` quede en `android/app/` y el `google-services.json` que ya está ahí caiga en su lugar sin moverlo.
  - Language: Kotlin. Minimum SDK: 21+ (ajustar si se necesita otro mínimo).
- [ ] **Agregar el plugin de Google Services** al `build.gradle.kts` de la raíz del proyecto (`android/build.gradle.kts`):
  ```kotlin
  plugins {
      // ...
      id("com.google.gms.google-services") version "4.5.0" apply false
  }
  ```
- [ ] **Aplicar el plugin y el SDK de Firebase** en el `build.gradle.kts` del módulo `app` (`android/app/build.gradle.kts`):
  ```kotlin
  plugins {
      id("com.android.application")
      id("com.google.gms.google-services")
      // ...
  }

  dependencies {
      // Firebase BoM: fija versiones compatibles entre SDKs de Firebase
      implementation(platform("com.google.firebase:firebase-bom:34.16.0"))

      // Firebase Auth es el único SDK de Firebase que el cliente Android
      // usa directamente (ADR-009: Firestore/Storage solo vía la API,
      // nunca con el SDK cliente). No agregar firebase-firestore ni
      // firebase-storage aquí.
      implementation("com.google.firebase:firebase-auth")
  }
  ```
- [ ] Sincronizar el proyecto (`Sync Now` en Android Studio) y confirmar que compila.
- [ ] Configurar Hilt para inyección de dependencias.
- [ ] Configurar ktlint/detekt (`docs/CodingStandards.md`).
- [ ] Repositorio remoto que encapsule la API y respete estados sellados (`Loading/Content/Empty/Error`) — nunca acceso directo a Firestore/Storage desde el cliente (ADR-009).

### Firebase

- [ ] Ejecutar `firebase deploy --only firestore:rules,firestore:indexes,storage` en el proyecto `development` y confirmar que las reglas deniegan el 100 % del acceso directo de clientes (ADR-009).
- [ ] Levantar Firebase Emulator Suite localmente (`firebase emulators:start`) usando los puertos ya fijados en `firebase.json`.
- [ ] Sembrar datos de prueba mínimos vía Admin SDK (no vía cliente) para validar reglas y emuladores.

### CI/CD

- [ ] Workflow de CI (GitHub Actions u otro, según ADR-008) por directorio: formato, lint, tipos, pruebas unitarias.
- [ ] Integrar Firebase Emulator Suite en CI para pruebas de integración (`docs/TestingGuide.md`).
- [ ] Pipeline de despliegue a `development` en cada merge a la rama principal (`docs/Deployment.md`).

### Documentación

- [ ] Actualizar este checklist con cualquier decisión tomada durante la ejecución (versiones exactas, nombres de proyecto Firebase, URL de CI).
- [ ] Registrar en `docs/Decisions.md` cualquier desviación respecto a ADR-008/009/010/011.

## Criterios de salida

- [ ] Backend y clientes pueden autenticarse contra el entorno `development` (Firebase Auth real o emulado).
- [ ] El pipeline de CI ejecuta formato, tipos, pruebas y emuladores en verde para los tres directorios.
- [ ] `firestore.rules`/`storage.rules` desplegadas y verificadas (un intento de lectura/escritura directa desde un cliente sin pasar por la API falla).
- [ ] Existe al menos un caso de uso end-to-end funcionando (`GET /me`) como prueba de arquitectura.

## Documentos relacionados

`docs/Roadmap.md` (Fase 0), `docs/Decisions.md` (ADR-008 a ADR-011), `docs/DevelopmentGuide.md`, `docs/CodingStandards.md`, `docs/TestingGuide.md`, `docs/Deployment.md`, `docs/Security.md`, `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `docs/api/openapi.yaml`.
