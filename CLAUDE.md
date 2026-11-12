# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del repositorio

**4adra** (Cuentas claras, gastos compartidos) corre sobre **Cloudflare** (ADR-014..017). La versión publicada es la 0.2.0 (ver `CHANGELOG.md`); está en curso la **pieza 2 de 4 (grupos y miembros)**, en la rama `feature/grupos-y-miembros`:

- **`backend/`**: Worker real (`4adra`) con Hono + D1 + Better Auth (Google). `GET`/`PATCH /api/v1/me` y `POST`/`GET /api/v1/groups` funcionan de punta a punta, con pruebas unitarias, de integración (runtime de Workers + D1 local) y de contrato (OpenAPI).
- **`web/`**: PWA en Angular 22 (ADR-019). Incluye login con Google, aviso de invitación, perfil editable, política de privacidad, crear un grupo y verlo en Inicio, y es instalable y funciona sin conexión. El Worker la sirve como Static Assets.
- **No hay app Android** (descartada, ADR-017): una sola PWA responsive sirve PC y celular.
- **`docs/`**: checklists por fase en `docs/checklists/`, contrato HTTP en `docs/api/openapi.yaml`, specs y planes en `docs/superpowers/`.

Producción: `https://4adra.edier.me`, con app y `/api` en el mismo origen. Local: `http://localhost:8787`.

### Comandos reales (desde `backend/`, Node 24 + npm, lockfile `package-lock.json`)

```bash
npm ci
cp .dev.vars.example .dev.vars   # completar BETTER_AUTH_SECRET (y Google para login real)
npm run db:migrate:local         # aplica backend/migrations a la D1 local
# agregar tu correo a allowed_emails local (docs/DevelopmentGuide.md) o el login dirá "Necesitas una invitación"
npm run dev                      # wrangler dev --infer-origin-from-routes=false → http://localhost:8787
npm test                         # unitarias + umbrales de cobertura (Vitest)
npx vitest run -t "nombreDelTest" # una prueba por nombre
npm run test:integration         # runtime de Workers + D1 local
npm run test:contract            # respuestas vs docs/api/openapi.yaml
npm run lint && npm run typecheck && npm run format:check
npm run build                    # wrangler deploy --dry-run
npm run cf-typegen               # regenerar worker-configuration.d.ts tras editar wrangler.jsonc
```

El deploy (build de `web/` + `db:migrate:remote` + `wrangler deploy`) solo lo hace CI con push a `main` (`.github/workflows/deploy-cloudflare.yml`). Para `wrangler deploy --dry-run` hace falta haber compilado `web/` antes.

### Comandos reales de `web/` (PWA Angular 22, Node 24 + npm, lockfile propio)

```bash
cd web
npm ci
npm start                        # ng serve → http://localhost:4200, con proxy de /api → localhost:8787
npm test                         # Vitest + umbral de cobertura del 70 %
npm run lint                     # angular-eslint
npm run build                    # → web/dist/web/browser (los Static Assets del Worker)
```

**Desarrollo local con login real:** dos terminales.
1. `cd backend && npm run dev`, con `TRUSTED_ORIGINS=http://localhost:4200` en `.dev.vars`.
2. `cd web && npm start`.

**Alternativa:** `cd web && npm run build` y luego `cd backend && npm run dev`, para probar todo en `localhost:8787`.

Si `wrangler dev` deja de responder, revisa que no queden instancias anteriores vivas en el puerto 8787.


## Flujo de trabajo (regla principal)

Todo trabajo nuevo sigue tres pasos, en orden y sin saltarse ninguno:

1. **`/backlog`** de la fase en curso (hoy, la pieza 2: grupos y miembros) → escribe **`BACKLOG.md`** en la raíz: contexto, stack y la lista de historias, con las hechas marcadas.
2. **`/story`** (el "plan") de UNA historia de `BACKLOG.md` → escribe **`PLAN.md`** en la raíz: la historia en curso con sus criterios, el plan, lo que queda fuera y sugerencias. Se reemplaza en cada historia nueva; al cerrarla, se marca hecha en `BACKLOG.md`.
3. **`/pair`** sobre `PLAN.md` → primero la lista de pruebas, y luego cada prueba en rojo antes del código mínimo. Nunca hace commit.

`BACKLOG.md` y `PLAN.md` se leen antes de proponer o escribir código. Esta regla manda sobre lo que digan los skills (por ejemplo, que el backlog no se guarde en archivos).

## Documento maestro

**`docs/AGENTS.md` tiene prioridad sobre el resto de la documentación.** Léelo antes de proponer diseño o código. Define arquitectura oficial, stack, patrones requeridos, modelo de entidades, convenciones de nombres y reglas para agentes de IA. Cualquier funcionalidad nueva debe, cuando aplique, actualizar también: `Architecture.md`, `DomainModel.md`, `DatabaseSchema.md`, `ApiSpecification.md`, `BusinessRules.md`, `Algorithms.md`, `Security.md` y `Roadmap.md` (y registrar decisiones relevantes en `Decisions.md`).

Mapa de la documentación:

- `docs/AGENTS.md` — reglas maestras y arquitectura oficial.
- `docs/Architecture.md`, `docs/DomainModel.md`, `docs/DatabaseSchema.md`, `docs/ApiSpecification.md` — diseño técnico.
- `docs/BusinessRules.md`, `docs/Algorithms.md` — reglas financieras y algoritmos determinísticos oficiales.
- `docs/Security.md`, `docs/Deployment.md` — controles de seguridad y proceso de despliegue.
- `docs/CodingStandards.md`, `docs/TestingGuide.md`, `docs/DevelopmentGuide.md` — convenciones de código, estrategia de pruebas y guía de contribución.
- `docs/Roadmap.md`, `docs/Decisions.md` (ADRs), `docs/Glossary.md` (lenguaje ubicuo) — evolución, decisiones y terminología.
- `docs/UISpecification.md` — inventario de pantallas, navegación y reglas de presentación de la PWA (PC y celular, todas las fases); precede a los wireframes visuales, que todavía no existen.
- `docs/Workflows.md` — guía operativa de los workflows de GitHub Actions y del flujo de ramas Git Flow, con comandos de ejemplo por paso.
- `docs/api/*.md` — contrato HTTP detallado por recurso (Auth, Groups, Expenses, Members, Balances, Settlements, Reports).
- `docs/domain/*.md` — detalle de cada entidad/value object del dominio.
- `docs/diagrams/*.drawio`, `docs/examples/*.json`, `docs/examples/D1Schema.sql` — diagramas, payloads de ejemplo y esquema D1 de referencia.
- `docs/superpowers/specs/`, `docs/superpowers/plans/` — specs de diseño y planes de implementación (la migración a Cloudflare: `2026-11-11-migracion-cloudflare*`).

## Arquitectura oficial

Clean Architecture + DDD Lite + MVVM, backend único en un Cloudflare Worker, event-driven:

```text
https://4adra.edier.me
 └─ Cloudflare Worker "4adra" (backend/wrangler.jsonc)
     ├─ /api/v1/*   → Hono (Presentation) → Application → Domain ← Infrastructure → D1
     ├─ /api/auth/* → Better Auth (Google OAuth, sesiones en D1)
     └─ /*          → Workers Static Assets (build de la PWA: web/dist/web/browser)
```

Las dependencias siempre apuntan hacia el dominio. El dominio (`domain/`) no conoce Hono, D1, Better Auth, Angular, HTTP ni JSON.

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| Presentation | UI, navegación, estado visual, handlers HTTP delgados (Hono) | Reglas de negocio y cálculos financieros |
| Application | Un caso de uso por operación, transacciones, autorización, eventos | Acceso directo a D1 o Better Auth |
| Domain | Entidades, value objects, estrategias, servicios de dominio | Frameworks, HTTP, JSON, D1 |
| Infrastructure | Repositorios y adaptadores concretos (`D1*Repository`, `BetterAuthAuthenticationProvider`) | Decisiones de negocio |

Estructura del backend (`backend/src/`): `domain/`, `application/`, `infrastructure/` (`d1/`, `auth/`), `presentation/` (Hono + `compositionRoot.ts`), `index.ts` (entrada del Worker). Las migraciones SQL viven en `backend/migrations/`. La PWA se organiza por funcionalidad y no replica algoritmos financieros: el backend es la única fuente de verdad para balances, liquidaciones, permisos, tasas y auditoría.

**Stack oficial:**
- **Backend:** TypeScript estricto sobre Cloudflare Workers + Hono + D1 (SQLite) + Better Auth (Google). R2, Web Push y Cron Triggers se suman cuando una fase los necesite.
- **Web:** PWA con Angular 22 (standalone, signals, zoneless), Angular Material 3 (tema verde-azulado) y `@angular/service-worker`. Vitest y angular-eslint. Interfaz solo en español, con todos los textos en `web/src/app/shared/texts.ts`. **Nunca se pide número de teléfono.**
- **Testing:** Vitest + `@cloudflare/vitest-plugin`.

### Motor de cálculo (pieza central del dominio)

Todo reparto, balance, conversión, redondeo y liquidación pasa por un `CalculationEngine` con estrategias intercambiables y versionadas mediante un `CalculationProfile` por grupo:

```text
CalculationEngine
├── SplitStrategy: Equal, ExactAmount, Percentage, Shares, Custom
├── BalanceStrategy: Classic, CashFlow, Historical
├── SettlementStrategy: Greedy, MinimumTransactions (default), MinimumMoneyMoved, PriorityBased, RoundRobin
├── CurrencyStrategy: HistoricRate, DailyRate, ManualRate, AverageRate
└── RoundingStrategy: HalfEven, HalfUp, AlwaysUp, AlwaysDown, None
```

Regla no negociable: **un perfil/estrategia publicado es inmutable**. Cada gasto conserva la versión del perfil con la que fue creado, de modo que activar un perfil nuevo nunca altera resultados históricos. Detalle de algoritmos y ejemplos numéricos en `docs/Algorithms.md`.

## Reglas de negocio no negociables

Ver `docs/BusinessRules.md` y `docs/DomainModel.md` para el detalle completo; las más estructurales:

- Un gasto tiene exactamente un pagador y pertenece a un grupo; si varias personas pagaron, se crean gastos separados.
- Los splits siempre totalizan el gasto exacto; residuales se asignan determinísticamente (orden por `UserId` ascendente).
- `Balance = Pagado - Consumido`; `Σ Balance = 0` en todo grupo. Los balances son proyecciones regenerables — **nunca se editan manualmente**, se recalculan desde gastos/splits/liquidaciones.
- Una liquidación (`Settlement`) reduce deuda pero nunca modifica gastos; no puede exceder la deuda, ni ser consigo mismo, ni monto ≤ 0.
- Tasas de cambio usadas quedan congeladas por gasto; los históricos nunca se recalculan con tasas nuevas.
- Todo es soft delete (`ACTIVE`, `ARCHIVED`, `DELETED`): nunca se borra físicamente auditoría, liquidaciones confirmadas ni tasas históricas.
- Todo grupo debe conservar al menos un `Owner` activo. Roles: `Owner`, `Administrator`, `Member`, `ReadOnly` (matriz de permisos en `docs/Security.md`).
- Dinero siempre en decimal de precisión arbitraria (`BigDecimal`/`Decimal.js`); **nunca `float`/`double`** para montos.

## Convenciones de nombres y código

- Nombres explícitos y con sufijo por rol: `ExpenseRepository`, `ExpenseFactory`, `CreateExpenseUseCase`, `D1ExpenseRepository`, `EqualSplitStrategy`, `ExpenseCreated`.
- Prohibidos nombres genéricos: `Manager`, `Helper`, `Util`/`Utils`, `Common`, `Data`, `Misc`.
- Métodos como acciones: `createExpense()`, `archiveGroup()`, `calculateBalances()`. Preferir `amount`, `user`, `group`, `participant`; evitar abreviaturas (`amt`, `usr`, `grp`).
- Value objects para conceptos de dominio en vez de primitivos: `Money`, `Percentage`, `CurrencyCode`, `Email`, `UserId`, `GroupId`, `ExpenseId`.
- Errores específicos de dominio (`GroupNotFoundException`, `CurrencyMismatchException`, `InvalidSplitException`), nunca genéricos; se traducen a HTTP solo en Presentation.
- Nunca instanciar dependencias concretas dentro de un caso de uso (solo en `presentation/compositionRoot.ts`) ni acceder a D1 directamente desde el dominio.
- Dinero en D1 siempre como `TEXT` decimal exacto, nunca `REAL`. Todo cambio de esquema va como migración nueva en `backend/migrations/`; nunca se editan migraciones ya aplicadas.

Detalle completo por stack (TypeScript estricto, Angular) en `docs/CodingStandards.md`.

## Testing

Cobertura mínima obligatoria: Domain 100 %, Application 95 %, Infrastructure 80 %, Presentation 70 % (`docs/TestingGuide.md`). Pruebas deterministas (sin hora/red real ni orden aleatorio), sin comparaciones aproximadas de `float`. La integración corre contra D1 local dentro del runtime de Workers (`npm run test:integration`), nunca contra producción, y nunca llama a Google. Todo cambio de estrategia de cálculo requiere pruebas doradas que demuestren reproducibilidad histórica antes de publicarse.

## Reglas para agentes de IA (de `docs/AGENTS.md`)

- Leer `AGENTS.md` antes de generar o cambiar código; respetar la arquitectura y reutilizar componentes existentes.
- No modificar contratos públicos (API, esquema, perfiles publicados) sin autorización explícita.
- Crear pruebas y actualizar la documentación afectada en el mismo cambio.
- Preferir la alternativa más simple, mantenible y consistente; no introducir dependencias ni deuda técnica deliberadamente.
- Las reglas de negocio y cálculos financieros existen **exclusivamente** en el backend; la PWA solo presenta y solicita operaciones.
