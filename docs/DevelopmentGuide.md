# DevelopmentGuide.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Guía operativa para contribuir al backend (Cloudflare Worker) y a la PWA sin romper la arquitectura, los contratos ni la trazabilidad financiera.

## Requisitos locales

- Node.js 24 (`backend/.nvmrc`) y npm con lockfile (`package-lock.json`).
- Wrangler (incluido como dependencia de desarrollo en `backend/`; no requiere instalación global).
- Navegador moderno y herramientas Angular para la PWA (cuando exista `web/`).
- Nunca usar la D1 ni los secretos de producción para pruebas manuales; en local todo corre contra la D1 local de Wrangler.

Las versiones exactas se fijan en los archivos del repositorio (`package.json`, `.nvmrc`, `compatibility_date` en `wrangler.jsonc`) y se documentan al modificarse.

## Inicio rápido

```text
1. Clonar el repositorio y revisar AGENTS.md.
2. Instalar dependencias usando el lockfile.
3. cd backend && cp .dev.vars.example .dev.vars (completar BETTER_AUTH_SECRET; GOOGLE_* para login real).
4. npm run db:migrate:local (D1 local).
5. Agregar tu correo a la lista de acceso local (ADR-018), o el login responde "Necesitas una invitación":
   npx wrangler d1 execute 4adra-db --local --command "INSERT INTO allowed_emails (email, created_at) VALUES ('tu-correo@gmail.com', strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
6. npm test, npm run test:integration, npm run test:contract, npm run lint, npm run typecheck.
7. npm run dev → http://localhost:8787 (API y login; sirve la PWA si web/ ya está compilada).
8. En otra terminal: cd web && npm ci && npm start → http://localhost:4200 (proxy de /api → 8787).
```

La lista de acceso de la base local es independiente de la de producción: hay que cargarla en cada equipo, y el correo va en minúsculas.

`npm run dev` ejecuta `wrangler dev --infer-origin-from-routes=false`. Sin esa opción, wrangler toma el dominio de producción de `wrangler.jsonc` (`4adra.edier.me`) como origen de las peticiones locales, y Better Auth rechaza el login con `INVALID_ORIGIN`. Por eso conviene usar siempre `npm run dev` y no `npx wrangler dev`.

Para el login con Google desde `localhost:4200`, `backend/.dev.vars` debe tener `TRUSTED_ORIGINS=http://localhost:4200`, y el cliente OAuth debe autorizar ese origen. Detén `wrangler dev` con Ctrl+C antes de abrir otra instancia: dos instancias en el puerto 8787 hacen que todo deje de responder. Si la app local se queda en "Cargando…", revisa con `netstat -ano | findstr :8787` que haya una sola instancia escuchando.

No copiar secretos de producción a archivos locales. Para login real en local, usar el cliente OAuth de Google con `http://localhost:8787` autorizado (ver `Deployment.md`).

## Organización y límites de capas

```text
backend/src/
├── domain/          entidades, value objects, interfaces, estrategias
├── application/     casos de uso, comandos, DTOs de aplicación
├── infrastructure/  d1/ (D1*Repository), auth/ (Better Auth), providers
├── presentation/    app Hono, middlewares, controladores, compositionRoot
└── index.ts         entrada del Worker
backend/migrations/  migraciones SQL de D1
```

El flujo es `Presentation -> Application -> Domain <- Infrastructure`. La PWA no accede a la base de datos; un caso de uso no importa Hono, D1 ni Better Auth; una entidad no retorna DTO HTTP.

## Cómo agregar una funcionalidad

1. Identificar reglas e invariantes en `BusinessRules.md` y `DomainModel.md`.
2. Actualizar la especificación antes o junto al código: API, esquema, algoritmos y seguridad según corresponda.
3. Crear o extender value objects, entidad o servicio de dominio sin dependencias de framework.
4. Definir interfaces de repositorio/servicio en Domain.
5. Crear un caso de uso pequeño en Application.
6. Implementar adaptadores D1 en Infrastructure (y la migración SQL en `backend/migrations/` si cambia el esquema).
7. Exponer un handler Hono delgado en Presentation, protegerlo con autenticación/autorización y conectarlo en `compositionRoot.ts`.
8. Agregar pruebas unitarias, de integración y contrato necesarias.
9. Validar con `npm run test:integration` y `npm run dev`, y actualizar la documentación del cambio.

## Crear un caso de uso

Un caso de uso recibe un comando tipado, valida permisos y estado mediante dependencias inyectadas, ejecuta reglas de dominio, persiste transaccionalmente, escribe auditoría y publica eventos. No debe depender de `Request`, `Response`, Hono, D1 ni interfaces de UI.

```text
CreateExpenseUseCase
  -> validar actor y membresía
  -> resolver CalculationProfile versionado
  -> construir Expense y Split con Domain
  -> persistencia atómica (db.batch en D1)
  -> auditoría + ExpenseCreated
  -> recálculo de balances
```

## Agregar una estrategia del motor de cálculo

1. Definir la interfaz y contrato en `Algorithms.md`.
2. Implementar una estrategia pura, determinista, sin E/S ni acceso a repositorios.
3. Asignar identificador y versión inmutables.
4. Registrar la estrategia en el `CalculationEngine` mediante composición/inyección, no mediante `if` dispersos.
5. Crear/actualizar `CalculationProfile` versionado.
6. Añadir pruebas doradas, casos límite y prueba de reproducción histórica.
7. No cambiar el comportamiento de estrategias ya publicadas: crear una versión nueva.

## Cambios de esquema (D1) y API

Todo cambio de esquema es una migración nueva (`backend/migrations/NNNN_descripcion.sql`); nunca se edita una migración aplicada. Columnas nuevas con valor por defecto o nulables para que la versión anterior del Worker siga funcionando. Antes de eliminar una columna, publicar una versión que ya no la use y luego retirarla en otra migración.

Todo endpoint mutante necesita autenticación, autorización, validación, `Idempotency-Key`, auditoría y prueba de contrato. Las mutaciones concurrentes usan versión de recurso, restricciones `UNIQUE`/`CHECK` y `db.batch` atómico.

## Modelo de ramas (Git Flow)

Ver ADR-013 en `Decisions.md` para el contexto completo. Resumen operativo:

- **`main`**: producción. Nunca recibe commits ni merges directos — solo PRs desde `release/*` o `hotfix/*`. Cada versión publicada lleva su tag `v<versión>`. Protegida contra push directo.
- **`develop`**: integración continua. Recibe merges desde `feature/*` vía Pull Request. Protegida contra push directo.
- **`feature/<slug>`**: una rama por tarea/funcionalidad, creada desde `develop`. PR de vuelta a `develop` cuando esté lista, con CI en verde.
- **`release/<version>`**: cortada de `develop` cuando un conjunto de features está listo para publicar. En la rama se actualiza `CHANGELOG.md` y la versión de `backend/` y `web/`, y se abre un PR a `main`. Tras el merge se pushea el tag `v<version>` (`release.yml` crea el GitHub Release) y se abre un PR de vuelta a `develop`. Pasos en `docs/Workflows.md`.
- **`hotfix/<slug>`**: corrección urgente cortada de `main`, se publica igual que una release (merge a `main` y a `develop`).

El deploy real a Cloudflare (`deploy-cloudflare.yml`) solo se dispara por push a `main` — nunca desde `develop` ni desde `feature/*`.

## Flujo de contribución

- Mantener cambios pequeños y enfocados.
- Ejecutar formato, lint, comprobación de tipos y pruebas pertinentes antes de abrir revisión.
- Explicar impacto funcional, datos, seguridad, API y migración en la descripción del cambio.
- No incluir secretos, archivos generados, cambios de dependencias no justificados ni refactors ajenos.
- Registrar decisiones de arquitectura relevantes en `Decisions.md`.

## Depuración

Reproducir primero en local (`npm run dev` + D1 local, o una prueba de integración) con datos mínimos. Usar `requestId`, logs estructurados y audit logs sin exponer PII. No corregir un problema financiero editando balances directamente: identificar el gasto, split, liquidación o estrategia que produce el resultado y aplicar una operación auditada.
