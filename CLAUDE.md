# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del repositorio

**4adra** (Cuentas claras, gastos compartidos) es, por ahora, un repositorio de especificación con configuración de plataforma ejecutable, pero sin código de aplicación todavía. Contiene `docs/` (incluidos los checklists accionables por fase en `docs/checklists/` y el contrato HTTP machine-readable `docs/api/openapi.yaml`), la configuración real de Firebase en la raíz (`firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `.firebaserc.example`) y tres directorios `backend/`, `web/`, `android/` que hoy solo tienen un `README.md` describiendo su estructura prevista — sin `package.json`, sin build files, sin tests, sin una sola línea de TypeScript/Kotlin/Angular real. No existen comandos de build/lint/test que ejecutar todavía. `docs/checklists/Fase0-FundacionTecnica.md` es la lista de lo que falta para que eso deje de ser cierto. Cuando se agregue código real, este archivo debe actualizarse con los comandos reales (gestor de paquetes, lockfile, scripts de test por capa, emuladores de Firebase, etc.); no inventar comandos que no existan en el repo.

## Documento maestro

**`docs/AGENTS.md` tiene prioridad sobre el resto de la documentación.** Léelo antes de proponer diseño o código. Define arquitectura oficial, stack, patrones requeridos, modelo de entidades, convenciones de nombres y reglas para agentes de IA. Cualquier funcionalidad nueva debe, cuando aplique, actualizar también: `Architecture.md`, `DomainModel.md`, `DatabaseSchema.md`, `ApiSpecification.md`, `BusinessRules.md`, `Algorithms.md`, `Security.md` y `Roadmap.md` (y registrar decisiones relevantes en `Decisions.md`).

Mapa de la documentación:

- `docs/AGENTS.md` — reglas maestras y arquitectura oficial.
- `docs/Architecture.md`, `docs/DomainModel.md`, `docs/DatabaseSchema.md`, `docs/ApiSpecification.md` — diseño técnico.
- `docs/BusinessRules.md`, `docs/Algorithms.md` — reglas financieras y algoritmos determinísticos oficiales.
- `docs/Security.md`, `docs/Deployment.md` — controles de seguridad y proceso de despliegue.
- `docs/CodingStandards.md`, `docs/TestingGuide.md`, `docs/DevelopmentGuide.md` — convenciones de código, estrategia de pruebas y guía de contribución.
- `docs/Roadmap.md`, `docs/Decisions.md` (ADRs), `docs/Glossary.md` (lenguaje ubicuo) — evolución, decisiones y terminología.
- `docs/api/*.md` — contrato HTTP detallado por recurso (Auth, Groups, Expenses, Members, Balances, Settlements, Reports).
- `docs/domain/*.md` — detalle de cada entidad/value object del dominio.
- `docs/diagrams/*.drawio`, `docs/examples/*.json` — diagramas y payloads de ejemplo.

## Arquitectura oficial (una vez exista código)

Clean Architecture + DDD Lite + MVVM, backend único en Firebase, event-driven:

```text
Android / Web (Presentation, MVVM)
     | HTTPS
Firebase Cloud Functions: Presentation -> Application -> Domain <- Infrastructure -> Firestore/Storage/Auth/Messaging
```

Las dependencias siempre apuntan hacia el dominio. El dominio (`domain/`) no conoce Firebase, Firestore, Angular, Android, HTTP ni JSON.

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| Presentation | UI, navegación, estado visual, handlers HTTP delgados | Reglas de negocio y cálculos financieros |
| Application | Un caso de uso por operación, transacciones, autorización, eventos | Acceso directo a Firebase |
| Domain | Entidades, value objects, estrategias, servicios de dominio | Frameworks, HTTP, JSON, Firebase |
| Infrastructure | Repositorios y adaptadores concretos (`Firestore*Repository`) | Decisiones de negocio |

Estructura prevista del backend (`backend/src/`): `domain/`, `application/`, `infrastructure/`, `presentation/`. Android y Web se organizan por funcionalidad y no replican algoritmos financieros del backend — el backend es la única fuente de verdad para balances, liquidaciones, permisos, tasas y auditoría.

Stack oficial: backend TypeScript/Node.js sobre Firebase Cloud Functions + Firestore + Auth + Storage + Cloud Messaging + Scheduler; Android en Kotlin/Jetpack Compose/MVVM/Hilt/Coroutines/Flow; Web en Angular/TypeScript/Angular Material/RxJS; testing con Jest, JUnit, MockK y Firebase Emulator.

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

- Nombres explícitos y con sufijo por rol: `ExpenseRepository`, `ExpenseFactory`, `CreateExpenseUseCase`, `FirestoreExpenseRepository`, `EqualSplitStrategy`, `ExpenseCreated`.
- Prohibidos nombres genéricos: `Manager`, `Helper`, `Util`/`Utils`, `Common`, `Data`, `Misc`.
- Métodos como acciones: `createExpense()`, `archiveGroup()`, `calculateBalances()`. Preferir `amount`, `user`, `group`, `participant`; evitar abreviaturas (`amt`, `usr`, `grp`).
- Value objects para conceptos de dominio en vez de primitivos: `Money`, `Percentage`, `CurrencyCode`, `Email`, `UserId`, `GroupId`, `ExpenseId`.
- Errores específicos de dominio (`GroupNotFoundException`, `CurrencyMismatchException`, `InvalidSplitException`), nunca genéricos; se traducen a HTTP solo en Presentation.
- Nunca instanciar dependencias concretas dentro de un caso de uso ni acceder a Firestore directamente desde el dominio.

Detalle completo por stack (TypeScript estricto, Kotlin idiomático, Angular) en `docs/CodingStandards.md`.

## Testing

Cobertura mínima obligatoria: Domain 100 %, Application 95 %, Infrastructure 80 %, Presentation 70 % (`docs/TestingGuide.md`). Pruebas deterministas (sin hora/red real ni orden aleatorio), sin comparaciones aproximadas de `float`, y con Firebase Emulator para integración — nunca contra producción. Todo cambio de estrategia de cálculo requiere pruebas doradas que demuestren reproducibilidad histórica antes de publicarse.

## Reglas para agentes de IA (de `docs/AGENTS.md`)

- Leer `AGENTS.md` antes de generar o cambiar código; respetar la arquitectura y reutilizar componentes existentes.
- No modificar contratos públicos (API, esquema, perfiles publicados) sin autorización explícita.
- Crear pruebas y actualizar la documentación afectada en el mismo cambio.
- Preferir la alternativa más simple, mantenible y consistente; no introducir dependencias ni deuda técnica deliberadamente.
- Las reglas de negocio y cálculos financieros existen **exclusivamente** en el backend; Android y Web solo presentan y solicitan operaciones.
