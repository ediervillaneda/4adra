# Decisions.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Active

## Objetivo

Registro de decisiones de arquitectura (ADR). Cada decisión importante conserva contexto, elección, consecuencias y estado. No se reescriben decisiones aceptadas: una decisión sustituida se marca como tal y se añade una nueva.

## Formato

Cada ADR incluye: identificador, fecha, estado (`Proposed`, `Accepted`, `Superseded`, `Deprecated`), contexto, decisión, consecuencias y referencias. Cambios con impacto en API, datos, seguridad, cálculos o despliegue deben agregar un ADR.

---

## ADR-001 — Clean Architecture y DDD Lite

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** La aplicación tiene reglas financieras, múltiples clientes y dependencia inicial de Firebase. La lógica no debe quedar acoplada a UI ni SDK.

**Decisión:** Usar Clean Architecture con capas Presentation, Application, Domain e Infrastructure; aplicar DDD Lite para entidades, value objects, agregados y eventos de dominio.

**Consecuencias:** El dominio queda testeable e independiente. Se requiere disciplina para no importar Firebase/HTTP en Domain y para crear adaptadores adicionales.

---

## ADR-002 — Cloud Functions como backend único

**Fecha:** 2026-07-13  
**Estado:** Superseded por ADR-014 (2026-11-11, migración a Cloudflare). Se conserva como historia.

**Contexto:** Android y Web necesitan resultados idénticos y validación de operaciones sensibles.

**Decisión:** Exponer API HTTP mediante Firebase Cloud Functions. Las operaciones financieras críticas no escriben Firestore directamente desde los clientes.

**Consecuencias:** Autorización, auditoría, idempotencia y cálculos se centralizan. El backend requiere observabilidad, despliegue y pruebas con Emulator Suite.

---

## ADR-003 — Firestore como persistencia con esquema lógico

**Fecha:** 2026-07-13  
**Estado:** Superseded por ADR-015 (2026-11-11, migración a Cloudflare). Se conserva como historia.

**Contexto:** Firestore no obliga esquema, pero el proyecto requiere consistencia de datos y consultas previsibles.

**Decisión:** Usar Firestore como infraestructura de persistencia, siguiendo `DatabaseSchema.md`, índices explícitos, documentos pequeños y soft delete para datos financieros.

**Consecuencias:** Las migraciones son responsabilidad de aplicación/infraestructura. Firestore no contiene reglas de negocio ni es la única descripción del modelo.

---

## ADR-004 — Dinero decimal y moneda base de grupo

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Los cálculos con punto flotante pueden introducir diferencias entre plataformas.

**Decisión:** Representar dinero con decimal de precisión arbitraria y `Money`; transportar importes como cadenas decimales. Cada gasto conserva moneda original, tasa histórica congelada y valor en moneda base del grupo.

**Consecuencias:** Se requiere un mapeo cuidadoso de DTOs y formateo solo en Presentation. Los balances históricos son reproducibles y no cambian al actualizar tasas.

---

## ADR-005 — Motor de algoritmos y perfiles versionados

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Diferentes grupos pueden requerir criterios de reparto, redondeo, tasa o liquidación distintos, sin alterar gastos existentes.

**Decisión:** Implementar `CalculationEngine` con estrategias intercambiables para split, balance, moneda, redondeo, validación y settlement. Asociar un `CalculationProfile` versionado a cada grupo y guardar su versión en cada gasto.

**Consecuencias:** Las estrategias publicadas son puras, deterministas e inmutables. Cambios de comportamiento requieren una versión nueva y pruebas doradas. Aumenta el número de pruebas y la necesidad de gobernar el registro de estrategias.

---

## ADR-006 — Auditoría inmutable y operaciones compensatorias

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** El historial financiero debe ser rastreable y una liquidación confirmada no puede desaparecer sin explicación.

**Decisión:** Registrar auditoría de adición para mutaciones; usar soft delete para gastos y operaciones compensatorias para correcciones financieras confirmadas.

**Consecuencias:** La consulta y retención de datos requieren controles de acceso. No se permite arreglar balances mediante edición directa.

---

## ADR-007 — API versionada e idempotente

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Clientes móviles pueden reintentar solicitudes y actualizarse de manera gradual.

**Decisión:** Versionar API en ruta mayor (`/api/v1`), exigir `Idempotency-Key` en mutaciones y usar `If-Match`/versiones de recurso para concurrencia.

**Consecuencias:** Se almacena estado de idempotencia durante un periodo definido y se mantiene compatibilidad al agregar campos opcionales. Cambios incompatibles exigen versión mayor y deprecación.

## ADR-008 — Stack y estructura técnica de Fase 0

**Fecha:** 2026-07-13
**Estado:** Superseded por ADR-014 y ADR-017 en lo relativo a Firebase, Cloud Functions y Android (siguen vigentes: GitHub Actions, npm con lockfile, carpetas independientes, TypeScript estricto) (2026-11-11, migración a Cloudflare). Se conserva como historia.

**Contexto:** `Roadmap.md` Fase 0 exige una base repetible (repositorio, entornos, CI) pero ningún documento fijaba versiones ni herramientas concretas, bloqueando el primer commit de código. El repositorio local no tenía `git remote` configurado, así que el hosting/CI tampoco estaba decidido.

**Decisión:** Repositorio en GitHub con GitHub Actions como CI (un workflow por directorio: `backend`, `web`, `android`, ejecutando el pipeline de `Deployment.md`). Un solo repositorio con tres directorios de nivel superior e independientes (`backend/`, `web/`, `android/`), cada uno con su propio gestor de dependencias y lockfile — sin herramienta de monorepo (Nx/Turborepo): Gradle (Android) y npm (backend/web) no comparten orquestación real y añadirla hoy sería complejidad sin beneficio, conforme a la preferencia de `AGENTS.md` por la alternativa más simple. Gestor de paquetes: npm con lockfile (`package-lock.json`) para `backend/` y `web/`. Node.js: se deja como "LTS activa vigente" en vez de fijar un número ahora — se confirma contra nodejs.org en el momento de crear `backend/.nvmrc`/`web/.nvmrc` durante el scaffolding real, para no quedar desactualizado. TypeScript estricto (`strict: true`), Angular en su versión LTS vigente, Kotlin/Gradle con el Android Gradle Plugin estable más reciente al iniciar el cliente Android.

**Consecuencias:** Cada plataforma puede evolucionar su toolchain de forma independiente sin coordinarse con una herramienta de monorepo. Las versiones exactas de Node/Angular/Kotlin/AGP deben fijarse en los archivos reales (`package.json`, `.nvmrc`, Gradle Wrapper) en cuanto se cree cada directorio — este ADR fija el criterio (npm, GitHub Actions, carpetas independientes), no el número de versión exacto. Repositorio remoto ya creado y conectado (`https://github.com/ediervillaneda/4adra`). Workflows de GitHub Actions creados en `.github/workflows/` (`backend.yml`, `web.yml`, `android.yml`, más `openapi-lint.yml` y `firebase-config.yml`, que validan hoy mismo `docs/api/openapi.yaml` y `firestore.rules`/`storage.rules` sin necesitar scaffolding de código); los tres primeros se activan automáticamente cuando exista `package.json`/`gradlew` real en cada carpeta.

---

## ADR-009 — Firestore y Storage sin acceso directo de clientes

**Fecha:** 2026-07-13
**Estado:** Superseded por ADR-015 (D1 solo es accesible vía binding del Worker; no existen reglas de cliente) (2026-11-11, migración a Cloudflare). Se conserva como historia.

**Contexto:** `Architecture.md` describe el flujo de clientes como `View -> ViewModel -> API client -> Cloud Functions`, sin mencionar Firestore ni Storage. `Security.md` exige denegar por defecto y que las operaciones críticas pasen por Cloud Functions. Mantener reglas de Firestore/Storage parcialmente abiertas (por ejemplo, lecturas directas por membresía) contradice ese flujo y duplicaría en reglas una autorización que ya vive en el backend.

**Decisión:** Android y Web nunca usan el SDK cliente de Firestore ni de Storage. Toda lectura y escritura pasa por la API HTTPS (Cloud Functions), que sí usa el Admin SDK (el cual ignora las reglas de seguridad). En consecuencia, `firestore.rules` y `storage.rules` deniegan el 100 % del acceso de clientes (`allow read, write: if false`), como defensa en profundidad ante un cliente que intente saltarse la API.

**Consecuencias:** No hay listeners en tiempo real de Firestore en los clientes; cualquier necesidad de actualización en vivo se resuelve con notificaciones push (FCM) que disparan un refetch por API, no con `onSnapshot`. Las reglas quedan simples y auditables. Si en el futuro se decide exponer lecturas directas de Firestore a los clientes (para aprovechar tiempo real), esto exige un ADR nuevo que reabra esta decisión y diseñe reglas de autorización por documento.

---

## ADR-010 — IDs deterministas para `groupMembers`

**Fecha:** 2026-07-13
**Estado:** Superseded por ADR-015 (restricción UNIQUE (group_id, user_id) en group_members) (2026-11-11, migración a Cloudflare). Se conserva como historia.

**Contexto:** `DatabaseSchema.md` no fijaba cómo se genera `membershipId`. Buscar "la membresía de este usuario en este grupo" con un ID aleatorio exige una consulta indexada en cada operación de autorización, lo cual es más lento y más código que una lectura directa por clave.

**Decisión:** El ID de `groupMembers/{membershipId}` es determinista: `{groupId}_{userId}`. Un usuario tiene como máximo una membresía vigente por grupo (invariante ya definida en `domain/Member.md`), por lo que la clave compuesta no pierde información y permite `get()` directo en vez de `query()` tanto en casos de uso del backend como en cualquier verificación futura de reglas.

**Consecuencias:** `DatabaseSchema.md` y `domain/Member.md` deben reflejar la convención. No afecta a los índices ya recomendados (`groupId + userId`), que siguen siendo útiles para listar miembros de un grupo.

---

## ADR-011 — Límites operativos y ventanas de expiración por defecto

**Fecha:** 2026-07-13
**Estado:** Proposed

**Contexto:** Varios documentos (`Security.md`, `api/Expenses.md`, `api/Members.md`, `api/Reports.md`, `ApiSpecification.md`) referenciaban límites como "política del grupo" o "configuración del sistema" sin un valor concreto, bloqueando la implementación de validaciones.

**Decisión:** Se fijan valores por defecto, ajustables a futuro vía `appSettings/{id}` sin requerir cambio de código:

| Límite | Valor por defecto |
|---|---|
| Tipos de adjunto permitidos | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| Tamaño máximo por adjunto | 10 MB |
| Adjuntos activos por gasto | 5 |
| Rate limit mutaciones autenticadas | 60 solicitudes/minuto por usuario |
| Rate limit lecturas autenticadas | 300 solicitudes/minuto por usuario |
| Rate limit no autenticado (por IP) | 20 solicitudes/minuto |
| Expiración de invitación | 7 días desde su creación |
| Expiración de reporte generado | 24 horas desde su creación |
| Duración de URL firmada (adjuntos y descargas de reporte) | 15 minutos |
| Ventana mínima de deprecación de API | 90 días entre anuncio y retiro de la versión anterior |
| Retención de auditoría financiera | Indefinida mientras la cuenta/grupo exista; sujeta a normativa fiscal aplicable en la jurisdicción de operación |
| Anonimización tras solicitud de eliminación de cuenta | Máximo 30 días para datos personales (nombre, correo, foto); la auditoría financiera con IDs opacos se conserva |

**Consecuencias:** Estos valores quedan reflejados en `Security.md`, `api/Expenses.md`, `api/Members.md`, `api/Reports.md` y `ApiSpecification.md`. Estado `Proposed` para los valores sin base legal confirmada (retención y anonimización), que deben validarse con asesoría legal antes de lanzamiento a producción; el resto (`Accepted` en la práctica) son parámetros técnicos de bajo riesgo y fácilmente ajustables.

---

## ADR-012 — Nombre de paquete Android

**Fecha:** 2026-07-13
**Estado:** Superseded por ADR-017 (sin app Android) (2026-11-11, migración a Cloudflare). Se conserva como historia.

**Contexto:** Ni Android ni Firebase permiten identificadores cuyo primer segmento empiece con dígito, así que "4adra" no es válido como `applicationId`. El nombre de paquete es esencialmente permanente una vez publicado en Play Store. Se propusieron primero `com.adra.app` y luego `com.eacorp.adra` como alternativas basadas en dominio. Se registró por error `com.edier.cuadra.app` en Firebase (proyecto `adra-54655`) — confirmado que "Cuadra" **no** era un cambio de marca intencional, fue una inconsistencia al escribirlo.

**Decisión:** `com.edier.adra.app`, siguiendo la convención ya usada en el resto del proyecto (`adra-54655`, "4adra"/"adra" en toda la documentación). Ya registrado en el proyecto Firebase `adra-54655` (mismo `project_number` `996278378799`); `android/app/google-services.json` actualizado con el nuevo `package_name`.

**Consecuencias:** El `applicationId` de Gradle debe ser exactamente `com.edier.adra.app` cuando se cree el proyecto real. El registro anterior (`com.edier.cuadra.app`) sigue existiendo en Firebase Console como app duplicada — eliminarlo ahí es opcional/limpieza, no bloqueante. Queda pendiente restringir la API key de este `google-services.json` en Google Cloud Console (`com.edier.adra.app` + SHA-1 del certificado de firma) antes de publicar.

---

## ADR-013 — Modelo de ramas Git Flow y publicación automatizada

**Fecha:** 2026-07-14
**Estado:** Accepted

**Contexto:** Hasta ahora el trabajo de Fase 0 se hizo en ramas `fase_#/task_#_<slug>` encadenadas directamente sobre `main`, sin rama de integración intermedia ni protección de rama (el repositorio era privado, y la API de GitHub para branch protection clásica devuelve 403 en repos privados del plan free — requiere GitHub Pro o repo público). El responsable del proyecto pidió explícitamente: nunca mergear directo a `main`, adoptar Git Flow, automatizar tests + publicación de release a `main` y `develop`, y disparar el deploy a Firebase solo al publicar a `main`.

**Decisión:**
- Repositorio pasado a **público** para habilitar branch protection clásica en `main` y `develop` (bloquea push directo, exige Pull Request).
- Modelo de ramas Git Flow estándar:
  - `main`: código en producción. Solo recibe merges desde `release/*` o `hotfix/*`, nunca commits directos.
  - `develop`: integración continua. Recibe merges desde `feature/*` vía PR.
  - `feature/<slug>`: una rama por funcionalidad/tarea, nace de `develop`, PR de vuelta a `develop`. Reemplaza la convención anterior `fase_#/task_#_<slug>`.
  - `release/<version>`: se corta de `develop` cuando un conjunto de features está listo para publicar. Al hacer push a `release/*`, el workflow `release.yml` corre la batería completa de tests (backend/web/android) y, si pasan, mergea automáticamente la rama a `main` (con tag `v<version>` y GitHub Release) y de vuelta a `develop`, manteniendo ambas ramas sincronizadas.
  - `hotfix/<slug>`: corrección urgente sobre `main`, se mergea a `main` y a `develop` igual que una release.
- El deploy a Firebase (`deploy-firebase.yml`) solo se dispara por push a `main` — es decir, únicamente después de que una release o hotfix se publicó ahí. Nunca se dispara desde `develop` ni desde ramas `feature/*`.
- Los workflows de CI existentes (`backend.yml`, `web.yml`, `android.yml`) ahora también corren en push a `develop` (antes solo `main`) y se exponen como reusables (`workflow_call`) para que `release.yml` los invoque sin duplicar lógica.
- `release-branch.yml` (agregado 2026-07-15, simplificado el mismo día): cuando un PR se **mergea** hacia una rama `release/*` (fixes de estabilización, no el corte inicial), se taguea como `v<version>-rc` y se crea un GitHub Release marcado `prerelease`. **Un solo entorno de Firebase** (decisión explícita del responsable del proyecto, 2026-07-15): no hay ambiente Staging separado ni deploy asociado a `release/*` — el único deploy real de Firebase ocurre con push a `main` (`deploy-firebase.yml`). No repite tests: ya corrieron como parte del PR (`pull_request:` de `backend.yml`/`web.yml`/`android.yml` no filtra por rama destino).

**Consecuencias:** El código de este repositorio (incluyendo `docs/`, reglas de negocio y especificación financiera) queda visible públicamente — decisión explícita del responsable del proyecto, aceptando ese trade-off a cambio de poder usar branch protection nativa de GitHub sin costo. Las ramas `fase_#/task_#_<slug>` ya creadas para Fase 0 se consolidan en una única `feature/backend-scaffold-fase0` para no abrir 17 PRs redundantes contra `develop`. El repositorio requirió habilitar "Allow GitHub Actions to create and approve pull requests" (`can_approve_pull_request_reviews`/`default_workflow_permissions: write` vía API, off por defecto) para que `release.yml` pueda abrir y mergear los PRs automáticos hacia `main`/`develop`.

Los secrets `FIREBASE_SERVICE_ACCOUNT`/`FIREBASE_PROJECT_ID_PRODUCTION` ya existen y apuntan al único proyecto Firebase real hoy, `adra-54655` (development) — no se crearon proyectos `staging`/`production` separados; el responsable del proyecto decidió un solo entorno de Firebase por ahora (2026-07-15), ver estado en `docs/checklists/Fase0-FundacionTecnica.md`. La cuenta de facturación de Google Cloud está cerrada, así que el deploy de Cloud Functions (plan Blaze) fallará hasta reactivarla, aunque Firestore/Storage rules sí deberían poder desplegarse.

**Actualización 2026-11-11 (ADR-014):** el deploy ahora es `deploy-cloudflare.yml` (también solo con push a `main`); `deploy-firebase.yml`, `firebase-config.yml` y `android.yml` se eliminaron. Los secrets `FIREBASE_SERVICE_ACCOUNT`/`FIREBASE_PROJECT_ID_PRODUCTION` ya no se usan y deben borrarse del repositorio en GitHub; los nuevos son `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.

---

## ADR-014 — Cloudflare Workers como backend y hosting únicos (Hono + Static Assets)

**Fecha:** 2026-11-11  
**Estado:** Accepted (spec `docs/superpowers/specs/2026-11-11-migracion-cloudflare-design.md`)

**Contexto:** El responsable del proyecto decidió eliminar Firebase por completo y publicar con Cloudflare, en `4adra.edier.me`, sin mantener servidores propios. La cuenta de facturación de Google Cloud estaba cerrada (ADR-013), lo que ya bloqueaba el deploy de Cloud Functions.

**Decisión:**
- **Un solo Worker `4adra`** (`backend/wrangler.jsonc`) sirve todo desde un mismo origen:
  - `/api/v1/*`: la API.
  - `/api/auth/*`: el login (ADR-016).
  - `/*`: los archivos estáticos de la PWA, con Workers Static Assets (`run_worker_first: ["/api/*"]` y `not_found_handling: single-page-application`).
- **Hono reemplaza a Express**, porque es nativo del runtime de Workers.
- **Las capas no cambian:** `domain/` y `application/` quedan igual. La única excepción es el puerto `AuthenticationProvider`, que pasa de `verifyIdToken` a `resolveSession(SessionCredential)`.
- **Entornos:** local con `wrangler dev` (`localhost:8787`) y producción en `4adra.edier.me` (custom domain). No hay staging.
- **Deploy:** solo desde CI con push a `main` (`deploy-cloudflare.yml`).
- **Equivalencias de los servicios de Firebase** (se implementan cuando una fase lo requiera):
  - Storage → R2.
  - Cloud Messaging → Web Push (VAPID).
  - Cloud Scheduler → Cron Triggers.
  - Emulator Suite → Miniflare / `@cloudflare/vitest-plugin`.

**Consecuencias:**
- **Sin CORS y con cookie de sesión del mismo origen.**
- **Trabajo en segundo plano:** solo vía `ctx.waitUntil`; la auditoría lo usa.
- **Runtime:** no hay Node completo. Se usa `nodejs_compat` cuando haga falta, y una librería que dependa de APIs de Node no soportadas no sirve.
- **Pruebas:** Vitest (Jest no corre en el runtime de Workers).
- **Requisitos:** la zona `edier.me` en la cuenta de Cloudflare, más los secrets `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` en GitHub (`docs/Deployment.md`).

---

## ADR-015 — Cloudflare D1 como persistencia relacional

**Fecha:** 2026-11-11  
**Estado:** Accepted

**Contexto:** Los datos de 4adra son muy relacionales (grupo → miembros → gastos → splits → liquidaciones) y exigen operaciones atómicas (un gasto con sus splits). Se evaluaron dos opciones:
- **D1 (SQLite administrado):** gratis en este volumen, sin otro proveedor y emulado en local.
- **PostgreSQL (Neon) vía Hyperdrive:** tipo `NUMERIC` exacto y más escala, pero con otro proveedor y Docker para desarrollar en local.

**Decisión:**
- **Motor:** D1, con el binding `DB` a la base `4adra-db`.
- **Esquema:**
  - Tablas `snake_case`, con llaves foráneas reales y `UNIQUE (group_id, user_id)` en `group_members` (reemplaza a ADR-010).
  - Montos, tasas y porcentajes en `TEXT` decimal exacto, validados por los value objects (`Money`/`Decimal.js`), nunca `REAL`.
  - Fechas en `TEXT` ISO-8601 UTC con milisegundos.
  - IDs UUID v7 generados en el backend.
- **Operaciones:**
  - Las escrituras atómicas de varios registros usan `db.batch([...])`, porque D1 no tiene transacciones interactivas.
  - `audit_logs` es inmutable mediante triggers `BEFORE UPDATE/DELETE` (refuerza ADR-006).
- **Migraciones:**
  - SQL numerado en `backend/migrations/`, aplicado con `wrangler d1 migrations apply` (local en CI, remoto en el deploy).
  - Solo se crean las tablas que el código usa. El destino completo está en `docs/examples/D1Schema.sql`.

**Consecuencias:**
- **Acceso:** la PWA no puede tocar la base; solo el Worker vía binding. Las reglas de seguridad de Firestore/Storage dejan de existir (reemplaza a ADR-009).
- **Límites:** 10 GB por base. Si se superan, migrar a PostgreSQL es directo porque el dominio solo conoce repositorios.
- **Diseño de casos de uso:** se debe pensar en `batch` en lugar de transacciones con lecturas intermedias.

---

## ADR-016 — Better Auth con Google y sesión por cookie del mismo origen

**Fecha:** 2026-11-11  
**Estado:** Accepted

**Contexto:** Al retirar Firebase Auth hacía falta otro proveedor de identidad. Opciones evaluadas:
- **Better Auth dentro del Worker:** sin terceros nuevos.
- **Google + enlace mágico por correo:** requiere un servicio de correo.
- **Usuario y contraseña:** más superficie de ataque.
- **SaaS (Clerk/Auth0):** reintroduce dependencia de terceros.

**Decisión:**
- **Librería y proveedor:** Better Auth montado en `/api/auth/*`, con un único proveedor social, Google. Usa el dialecto D1 nativo de la librería y guarda identidad y sesiones en las tablas `user`, `session`, `account` y `verification` (`0001_init.sql`).
- **Sesión:** cookie `HttpOnly; Secure; SameSite=Lax` del mismo origen.
- **Middleware `authenticate`:** pasa el encabezado `Cookie` como `SessionCredential` opaco a `BetterAuthAuthenticationProvider`, que valida con `auth.api.getSession`.
- **Identificadores:** el `user.id` de Better Auth (UUID v7) es el `UserId` del dominio. El perfil de dominio vive en `users` y lo crea `GetCurrentUserProfileUseCase` en el primer acceso.
- **Secretos:** `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, con `wrangler secret put` en producción y `.dev.vars` en local. Nunca en el repositorio.

**Consecuencias:**
- **Contrato OpenAPI:** `securitySchemes` pasa de `bearerAuth` (Firebase ID Token) a `cookieAuth`, autorizado explícitamente por el responsable del proyecto.
- **Pruebas:** nunca llaman a Google. Las de integración habilitan email y contraseña solo en su propia instancia, para sembrar sesiones reales.
- **Futuro:** agregar el enlace mágico por correo es un cambio aditivo.

---

## ADR-017 — Solo PWA; se descarta la app Android nativa

**Fecha:** 2026-11-11  
**Estado:** Accepted

**Contexto:** El plan original tenía dos clientes: Angular para la web y Kotlin/Compose para Android. Eso duplicaba cada pantalla y su mantenimiento, para un producto de gastos compartidos entre grupos de amigos o familia.

**Decisión:** Un único cliente, la PWA en Angular, responsive para PC y celular e instalable desde el navegador ("Agregar a pantalla de inicio"). Se servirá como Static Assets del Worker (ADR-014). Se eliminan `android/`, `google-services.json`, `android.yml` y el ADR-012 queda reemplazado. El scaffolding de la PWA es un subproyecto con spec propio.

**Consecuencias:**
- No hay presencia en Google Play.
- Las notificaciones push en Android van por Web Push, algo más limitadas que FCM nativo.
- `UISpecification.md`, `CodingStandards.md`, `TestingGuide.md` y `Roadmap.md` dejan de describir Android.
- Volver a una app nativa exigiría un ADR nuevo.

## ADR-018 — Acceso a la plataforma solo por lista (inscripción manual)

**Fecha:** 2026-11-11  
**Estado:** Accepted

**Contexto:** Con el login con Google abierto, cualquier cuenta de Google podría crear una cuenta en 4adra. El responsable del proyecto quiere que solo entren personas invitadas. Al inicio habrá dos usuarios en producción, así que no se justifica construir un flujo de invitaciones.

Además, el "modo prueba" de Google no sirve como control de acceso:
- obliga a gestionar usuarios en la consola de Google;
- tiene un límite de 100 usuarios;
- muestra una advertencia de app no verificada.

**Decisión:**
- **Tabla `allowed_emails`** (`0002_allowed_emails.sql`): correo en minúsculas, nota opcional, fecha de alta y `revoked_at`.
- **Hook de registro:** `createAuth` recibe `isSignUpAllowed` y registra un hook `databaseHooks.user.create.before` de Better Auth. Si el correo no está vigente en la lista, rechaza la creación de la cuenta con `403 NOT_INVITED`. En el login con Google, eso redirige a `/api/auth/error?error=NOT_INVITED`.
- **Puerto de dominio:** `AllowedEmailRepository`, implementado por `D1AllowedEmailRepository`.
- **Usuarios existentes:** el filtro solo actúa al crear cuentas, así que los usuarios que ya existen siguen entrando.
- **Inscripción y revocación:** son manuales, con `wrangler d1 execute --remote` (`docs/Deployment.md`). No hay endpoints, rol de administrador ni envío de correos.
- **Privacidad:** los correos nunca se versionan, porque el repositorio es público.

**Consecuencias:**
- La app de Google puede publicarse para cualquier cuenta, ya que el filtro real vive en el Worker.
- Revocar un correo impide registrarse, pero no expulsa a un usuario ya creado. Para bloquearlo se usa `users.status = 'DISABLED'`, que ya responde 403 `USER_DISABLED`.
- **Evolución prevista:** invitaciones desde la app con un rol `PLATFORM_ADMIN` y, opcionalmente, correo de invitación. Se construirá sobre la misma tabla, en un ADR nuevo.

## Cómo añadir una decisión

Copiar el formato ADR, usar el siguiente identificador, enlazar documentos afectados y describir riesgos/alternativas consideradas. No usar este registro para tareas pequeñas de implementación ni para notas temporales.
