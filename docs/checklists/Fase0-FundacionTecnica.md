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

- [ ] Confirmar o ajustar ADR-008 (Node.js LTS exacta, npm vs otro gestor, versión de Angular, versión de Kotlin/AGP) — hoy son valores por defecto propuestos, no confirmados.
- [ ] Copiar `.firebaserc.example` a `.firebaserc` y sustituir los IDs de proyecto por los reales una vez creados en Firebase Console (`4adra-dev`, `4adra-staging`, `4adra-prod` o los nombres reales).
- [ ] Crear los tres proyectos Firebase (development, staging, production) descritos en `docs/Deployment.md`, cada uno con Auth, Firestore, Storage y Cloud Messaging habilitados.
- [ ] Definir plantillas de variables de entorno sin secretos (`.env.example` por plataforma) según `docs/DevelopmentGuide.md`.

### Backend (`backend/`)

- [ ] Inicializar proyecto Node.js/TypeScript con `strict: true` (`docs/CodingStandards.md`).
- [ ] Crear estructura de carpetas `backend/src/{domain,application,infrastructure,presentation}` (`docs/DevelopmentGuide.md`).
- [ ] Configurar ESLint + Prettier según `docs/CodingStandards.md`.
- [ ] Configurar Jest para pruebas unitarias e integración con Firebase Emulator.
- [ ] Fijar versión de Node en `backend/.nvmrc` y `engines.node` de `package.json`.
- [ ] Implementar el primer caso de uso trivial (por ejemplo `GET /me` de `docs/api/Auth.md`) de punta a punta, atravesando las cuatro capas, como prueba de que la arquitectura funciona antes de escalar a más funcionalidad.
- [ ] Configurar inyección de dependencias (contenedor o composición manual) sin instancias concretas dentro de casos de uso.
- [ ] Manejo de errores: excepciones de dominio específicas (`docs/CodingStandards.md`) traducidas a HTTP solo en Presentation, con el sobre de error de `docs/ApiSpecification.md`.
- [ ] Auditoría base: escritura de `auditLogs` desde un middleware/decorador común, no repetida por caso de uso.

### Web (`web/`)

- [ ] Inicializar proyecto Angular con Angular Material y RxJS (`docs/AGENTS.md`).
- [ ] Configurar ESLint (Angular) y estructura por funcionalidad (`docs/CodingStandards.md`).
- [ ] Cliente HTTP tipado apuntando a `docs/api/openapi.yaml` (generar tipos o usarlo como referencia de contrato).

### Android (`android/`)

- [ ] Inicializar proyecto Kotlin/Jetpack Compose con Hilt.
- [ ] Configurar ktlint/detekt.
- [ ] Repositorio remoto que encapsule la API y respete estados sellados (`Loading/Content/Empty/Error`).

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
