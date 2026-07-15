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
**Estado:** Accepted

**Contexto:** Android y Web necesitan resultados idénticos y validación de operaciones sensibles.

**Decisión:** Exponer API HTTP mediante Firebase Cloud Functions. Las operaciones financieras críticas no escriben Firestore directamente desde los clientes.

**Consecuencias:** Autorización, auditoría, idempotencia y cálculos se centralizan. El backend requiere observabilidad, despliegue y pruebas con Emulator Suite.

---

## ADR-003 — Firestore como persistencia con esquema lógico

**Fecha:** 2026-07-13  
**Estado:** Accepted

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
**Estado:** Accepted (confirmado por el responsable del proyecto el 2026-07-13)

**Contexto:** `Roadmap.md` Fase 0 exige una base repetible (repositorio, entornos, CI) pero ningún documento fijaba versiones ni herramientas concretas, bloqueando el primer commit de código. El repositorio local no tenía `git remote` configurado, así que el hosting/CI tampoco estaba decidido.

**Decisión:** Repositorio en GitHub con GitHub Actions como CI (un workflow por directorio: `backend`, `web`, `android`, ejecutando el pipeline de `Deployment.md`). Un solo repositorio con tres directorios de nivel superior e independientes (`backend/`, `web/`, `android/`), cada uno con su propio gestor de dependencias y lockfile — sin herramienta de monorepo (Nx/Turborepo): Gradle (Android) y npm (backend/web) no comparten orquestación real y añadirla hoy sería complejidad sin beneficio, conforme a la preferencia de `AGENTS.md` por la alternativa más simple. Gestor de paquetes: npm con lockfile (`package-lock.json`) para `backend/` y `web/`. Node.js: se deja como "LTS activa vigente" en vez de fijar un número ahora — se confirma contra nodejs.org en el momento de crear `backend/.nvmrc`/`web/.nvmrc` durante el scaffolding real, para no quedar desactualizado. TypeScript estricto (`strict: true`), Angular en su versión LTS vigente, Kotlin/Gradle con el Android Gradle Plugin estable más reciente al iniciar el cliente Android.

**Consecuencias:** Cada plataforma puede evolucionar su toolchain de forma independiente sin coordinarse con una herramienta de monorepo. Las versiones exactas de Node/Angular/Kotlin/AGP deben fijarse en los archivos reales (`package.json`, `.nvmrc`, Gradle Wrapper) en cuanto se cree cada directorio — este ADR fija el criterio (npm, GitHub Actions, carpetas independientes), no el número de versión exacto. Repositorio remoto ya creado y conectado (`https://github.com/ediervillaneda/4adra`). Workflows de GitHub Actions creados en `.github/workflows/` (`backend.yml`, `web.yml`, `android.yml`, más `openapi-lint.yml` y `firebase-config.yml`, que validan hoy mismo `docs/api/openapi.yaml` y `firestore.rules`/`storage.rules` sin necesitar scaffolding de código); los tres primeros se activan automáticamente cuando exista `package.json`/`gradlew` real en cada carpeta.

---

## ADR-009 — Firestore y Storage sin acceso directo de clientes

**Fecha:** 2026-07-13
**Estado:** Accepted

**Contexto:** `Architecture.md` describe el flujo de clientes como `View -> ViewModel -> API client -> Cloud Functions`, sin mencionar Firestore ni Storage. `Security.md` exige denegar por defecto y que las operaciones críticas pasen por Cloud Functions. Mantener reglas de Firestore/Storage parcialmente abiertas (por ejemplo, lecturas directas por membresía) contradice ese flujo y duplicaría en reglas una autorización que ya vive en el backend.

**Decisión:** Android y Web nunca usan el SDK cliente de Firestore ni de Storage. Toda lectura y escritura pasa por la API HTTPS (Cloud Functions), que sí usa el Admin SDK (el cual ignora las reglas de seguridad). En consecuencia, `firestore.rules` y `storage.rules` deniegan el 100 % del acceso de clientes (`allow read, write: if false`), como defensa en profundidad ante un cliente que intente saltarse la API.

**Consecuencias:** No hay listeners en tiempo real de Firestore en los clientes; cualquier necesidad de actualización en vivo se resuelve con notificaciones push (FCM) que disparan un refetch por API, no con `onSnapshot`. Las reglas quedan simples y auditables. Si en el futuro se decide exponer lecturas directas de Firestore a los clientes (para aprovechar tiempo real), esto exige un ADR nuevo que reabra esta decisión y diseñe reglas de autorización por documento.

---

## ADR-010 — IDs deterministas para `groupMembers`

**Fecha:** 2026-07-13
**Estado:** Accepted

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
**Estado:** Accepted (registrado en Firebase y `google-services.json` reemplazado)

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

**Consecuencias:** El código de este repositorio (incluyendo `docs/`, reglas de negocio y especificación financiera) queda visible públicamente — decisión explícita del responsable del proyecto, aceptando ese trade-off a cambio de poder usar branch protection nativa de GitHub sin costo. Los proyectos Firebase `staging`/`production` y sus secretos (`FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID_PRODUCTION`) deben crearse y cargarse manualmente en GitHub Secrets antes de que `deploy-firebase.yml` pueda completar un despliegue real; hasta entonces el job se omite sin fallar, siguiendo el mismo patrón de guardas usado en los workflows existentes. Las ramas `fase_#/task_#_<slug>` ya creadas para Fase 0 se consolidan en una única `feature/backend-scaffold-fase0` para no abrir 17 PRs redundantes contra `develop`.

## Cómo añadir una decisión

Copiar el formato ADR, usar el siguiente identificador, enlazar documentos afectados y describir riesgos/alternativas consideradas. No usar este registro para tareas pequeñas de implementación ni para notas temporales.
