# AGENTS.md — 4adra

> Expense-sharing platform inspired by Splitwise/Settle Up.
> **Architecture:** Clean Architecture + DDD Lite + MVVM + Firebase Backend + Event Driven

## Project Status

This project is in **Phase 0 (Foundation)**. There is no application source code yet. What exists today: comprehensive documentation in `docs/` (including a machine-readable contract at `docs/api/openapi.yaml` and per-phase checklists in `docs/checklists/`), real Firebase platform configuration at the repo root (`firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `.firebaserc.example`), and placeholder `README.md` files in `backend/`, `web/`, `android/` describing their intended structure — no `package.json`, no Gradle project, no Angular project yet. See `docs/checklists/Fase0-FundacionTecnica.md` for the actionable list of what's left. Before writing any code, read `docs/AGENTS.md` for the full project rules (in Spanish).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | TypeScript, Node.js, Firebase Cloud Functions, Firestore, Auth, Storage |
| Android | Kotlin, Jetpack Compose, MVVM, Hilt, Coroutines, Flow |
| Web | Angular, TypeScript, Angular Material, RxJS |
| Testing | Jest, JUnit, MockK, Firebase Emulator |

---

## Planned Build / Lint / Test Commands

None of these exist yet except the Firebase ones, which now have real config to point at (`firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json` at the repo root) but still need a real Firebase project (copy `.firebaserc.example` to `.firebaserc` with real project IDs first). The Backend/Android/Web commands below require the scaffolding in `docs/checklists/Fase0-FundacionTecnica.md` to exist first — do not run them against this repo as-is.

### Backend (TypeScript/Node.js)

```bash
npm run build               # compile TypeScript
npm run lint                # ESLint strict
npm run lint:fix            # auto-fix
npm run format              # Prettier
npm run format:check        # CI check
npm run typecheck           # type-check (no emit)
npm test                    # all tests (Jest)
npm test -- -t "test name"  # single test by name
npm test -- src/domain/     # tests in a directory
npm test -- --coverage      # with coverage report
```

### Firebase

```bash
npx firebase emulators:start --only firestore,auth  # start emulators
npx firebase deploy --only functions                 # deploy functions
npx firebase deploy --only firestore:rules firestore:indexes
```

### Android

```bash
./gradlew build                  # build
./gradlew test                   # unit tests (JUnit)
./gradlew connectedAndroidTest   # instrumented tests
./gradlew lint                   # lint (detekt/ktlint)
```

### Web (Angular)

```bash
ng build    # build
ng test     # unit tests
ng lint     # lint
```

---

## Code Style Guidelines

### TypeScript (Backend)

- `strict: true` in tsconfig — never use `any`, use `unknown` + runtime validation
- `const` by default; never mutate function arguments
- Use `decimal.js` for monetary values — never `float` or `double`
- Prefer named exports over default exports
- Async/await over raw Promises; never fire-and-forget in handlers
- Handlers only convert transport, extract identity, call a use case, map response

### Kotlin (Android)

- `val` by default; explicit nullability
- Jetpack Compose with immutable state and explicit events
- Coroutines + structured concurrency; never `GlobalScope`
- Model screen states as sealed classes: `Loading`, `Content`, `Empty`, `Error`

### Angular (Web)

- TypeScript strict mode; services encapsulate HTTP; components never build URLs
- RxJS with proper subscription cleanup
- Sanitize external content; no untrusted `innerHTML`

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Classes, interfaces, types | PascalCase | `ExpenseRepository` |
| Methods, properties, variables | camelCase | `createExpense()` |
| Constants | UPPER_SNAKE_CASE | `MAX_PARTICIPANTS` |
| Use cases | `VerbNounUseCase` | `CreateExpenseUseCase` |
| Repositories | `EntityRepository` | `ExpenseRepository` |
| Firebase repos | `FirestoreEntityRepository` | `FirestoreExpenseRepository` |
| Strategies | `TypeStrategy` | `EqualSplitStrategy` |
| Events | `EntityEvent` | `ExpenseCreated` |
| DTOs | `EntityDto` | `ExpenseDto` |
| Mappers | `EntityMapper` | `ExpenseMapper` |

**Forbidden names:** `Manager`, `Helper`, `Utils`, `Common`, `Data`, `Misc`

---

## Directory Structure (Planned)

```
backend/src/
├── domain/          # entities, value objects, interfaces, strategies
├── application/     # use cases, commands, DTOs
├── infrastructure/  # Firestore, Auth, Storage, providers
└── presentation/    # Cloud Functions, HTTP handlers, transport mapping

android/             # Kotlin, Jetpack Compose, MVVM
web/                 # Angular, TypeScript, Angular Material
```

| Layer | May Depend On | Never Depends On |
|---|---|---|
| Presentation | Application, external adapters | Domain directly, Infrastructure |
| Application | Domain | Firebase SDK, Infrastructure |
| Domain | Nothing external | Any framework, HTTP, Firebase |
| Infrastructure | Domain interfaces | Application layer |

---

## Money & Financial Rules

- Always use `Money` value object with `Amount` + `Currency`
- Use `BigDecimal` / `decimal.js` — never floating point for money
- Exchange rates are frozen at expense creation time — never recalculated
- Balances are materialized and regenerable — never edit manually
- All calculations must be deterministic and idempotent
- `Σ Balance` must always equal `0` within a group
- `Σ Paid` must equal `Σ Consumed` across all participants

---

## Error Handling

- Use specific domain exceptions: `GroupNotFoundException`, `PermissionDeniedException`, `InvalidSplitException`
- Never throw generic `Error` or `Exception`
- Map domain errors to HTTP codes only in Presentation layer
- Always include `requestId` in error responses

---

## Testing Requirements

| Layer | Coverage | Framework |
|---|---|---|
| Domain | 100% | Jest / JUnit + MockK |
| Application | 95% | Jest / JUnit |
| Infrastructure | 80% | Jest + Firebase Emulator |
| Presentation | 70% | Compose UI Test / Angular TestBed |

- Every bug fix must include a regression test
- Financial tests use exact decimals, never approximate comparisons
- Use `Firebase Emulator` for integration tests — never hit production
- Name tests by behavior: `shouldRejectSplitWhenAmountsDoNotMatchExpenseTotal`

---

## Git Conventions

- Commit format: `type(scope): description` (imperative mood)
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Examples: `feat(expenses): validate percentage split totals`, `fix(balances): correct residual rounding`

---

## Documentation Updates

When changing code, update the corresponding docs in `docs/`:

- `Architecture.md` — layer changes
- `DomainModel.md` — entity/aggregate changes
- `DatabaseSchema.md` — Firestore schema changes
- `ApiSpecification.md` — endpoint changes
- `BusinessRules.md` — rule changes
- `Algorithms.md` — algorithm changes
- `Security.md` — security changes
- `Roadmap.md` — milestone changes

---

## Key Invariants (Never Break These)

1. Single source of truth — backend calculates everything, clients only present
2. One payer per expense — split if multiple people paid
3. Splits must total the expense amount exactly
4. Settlements cannot exceed debt
5. No circular settlements when simplification is possible
6. Audit logs are never deleted
7. Exchange rates are immutable once used
8. Groups must always have at least one Owner
