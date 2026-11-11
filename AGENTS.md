# AGENTS.md — 4adra

> Expense-sharing platform inspired by Splitwise/Settle Up.
> **Architecture:** Clean Architecture + DDD Lite + MVVM + Cloudflare Workers backend + Event Driven

## Project Status

**Phase 0 (Foundation)**, platform migrated from Firebase to Cloudflare (ADR-014..017). What exists today:

- `backend/`: real Cloudflare Worker (`4adra`) — Hono + D1 + Better Auth (Google). `GET /api/v1/me` works end to end; unit, integration (Workers runtime + local D1) and contract (OpenAPI) tests.
- `web/`: still only a `README.md`. The PWA (Angular) is the next sub-project and gets its own spec.
- No Android app (discarded, ADR-017): a single responsive PWA serves PC and mobile.
- `docs/`: full documentation, contract at `docs/api/openapi.yaml`, per-phase checklists in `docs/checklists/`.

Production URL: `https://4adra.edier.me` (app and `/api` on the same origin). Local: `http://localhost:8787`. Before writing any code, read `docs/AGENTS.md` for the full project rules (in Spanish).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | TypeScript (strict), Cloudflare Workers, Hono, Cloudflare D1 (SQLite), Better Auth (Google OAuth), Wrangler |
| Web (PWA) | Angular, TypeScript, Angular Material, RxJS — served as Workers Static Assets (planned) |
| Testing | Vitest, `@cloudflare/vitest-plugin` (Workers runtime + local D1), ajv contract tests |

---

## Build / Lint / Test Commands (backend, real)

Run from `backend/` (Node 24, npm):

```bash
npm ci
npm run dev                 # wrangler dev → http://localhost:8787 (needs .dev.vars, see .dev.vars.example)
npm run db:migrate:local    # apply backend/migrations to local D1
npm test                    # unit tests + coverage thresholds (Vitest)
npx vitest run test/unit/domain           # tests in a directory
npx vitest run -t "shouldRejectForgedCookie"  # single test by name
npm run test:integration    # Workers runtime + local D1 (Better Auth, repositories, /api/v1/me e2e)
npm run test:contract       # responses vs docs/api/openapi.yaml
npm run lint                # ESLint strict
npm run format              # Prettier (format:check in CI)
npm run typecheck           # tsc --noEmit
npm run build               # wrangler deploy --dry-run --outdir dist
npm run cf-typegen          # regenerate worker-configuration.d.ts after editing wrangler.jsonc
npm run db:migrate:remote   # apply migrations to production D1 (CI does this on main)
npm run deploy              # wrangler deploy (CI does this on main)
```

Web (Angular) commands do not exist yet — do not invent them.

---

## Code Style Guidelines

### TypeScript (Backend)

- `strict: true` in tsconfig — never use `any`, use `unknown` + runtime validation
- `const` by default; never mutate function arguments
- Use `decimal.js` for monetary values — never `float` or `double`; D1 stores money as `TEXT`, never `REAL`
- Prefer named exports over default exports (the Worker entry `src/index.ts` is the only default export)
- Async/await over raw Promises; background work only through `ctx.waitUntil`
- Handlers only convert transport, extract identity, call a use case, map response

### Angular (Web PWA)

- TypeScript strict mode; services encapsulate HTTP; components never build URLs
- RxJS with proper subscription cleanup
- Sanitize external content; no untrusted `innerHTML`
- Responsive first: the same app serves PC and mobile

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Classes, interfaces, types | PascalCase | `ExpenseRepository` |
| Methods, properties, variables | camelCase | `createExpense()` |
| Constants | UPPER_SNAKE_CASE | `MAX_PARTICIPANTS` |
| Use cases | `VerbNounUseCase` | `CreateExpenseUseCase` |
| Repositories | `EntityRepository` | `ExpenseRepository` |
| D1 repos | `D1EntityRepository` | `D1ExpenseRepository` |
| Strategies | `TypeStrategy` | `EqualSplitStrategy` |
| Events | `EntityEvent` | `ExpenseCreated` |
| DTOs | `EntityDto` | `ExpenseDto` |
| Mappers | `EntityMapper` | `ExpenseMapper` |

**Forbidden names:** `Manager`, `Helper`, `Utils`, `Common`, `Data`, `Misc`

---

## Directory Structure

```
backend/
├── src/
│   ├── domain/          # entities, value objects, ports, strategies (no frameworks)
│   ├── application/     # use cases, commands, DTOs
│   ├── infrastructure/  # d1/ (D1*Repository), auth/ (Better Auth)
│   ├── presentation/    # Hono app, middlewares, controllers, compositionRoot
│   └── index.ts         # Worker entry (export default { fetch })
├── migrations/          # D1 SQL migrations (NNNN_description.sql)
├── public/              # static assets (PWA build later)
└── wrangler.jsonc       # Worker, D1 binding, assets, route 4adra.edier.me
web/                     # Angular PWA (planned)
```

| Layer | May Depend On | Never Depends On |
|---|---|---|
| Presentation | Application, external adapters | Domain directly, Infrastructure |
| Application | Domain | Hono, D1, Better Auth, Infrastructure |
| Domain | Nothing external | Any framework, HTTP, D1, Better Auth |
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
| Domain | 100% | Vitest |
| Application | 95% | Vitest |
| Infrastructure | 80% | Vitest + `@cloudflare/vitest-plugin` (local D1) |
| Presentation | 70% | Vitest (`app.request`) / Angular TestBed |

- Every bug fix must include a regression test
- Financial tests use exact decimals, never approximate comparisons
- Integration tests run against local D1 in the Workers runtime — never hit production
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
- `DatabaseSchema.md` — D1 schema changes (plus a new migration in `backend/migrations/`)
- `ApiSpecification.md` — endpoint changes
- `BusinessRules.md` — rule changes
- `Algorithms.md` — algorithm changes
- `Security.md` — security changes
- `Roadmap.md` — milestone changes
- `UISpecification.md` — new/changed screens, navigation, or presentation rules (PWA)

---

## Key Invariants (Never Break These)

1. Single source of truth — backend calculates everything, clients only present
2. One payer per expense — split if multiple people paid
3. Splits must total the expense amount exactly
4. Settlements cannot exceed debt
5. No circular settlements when simplification is possible
6. Audit logs are never deleted (enforced by D1 triggers)
7. Exchange rates are immutable once used
8. Groups must always have at least one Owner
