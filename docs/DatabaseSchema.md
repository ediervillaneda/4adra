# DatabaseSchema.md

> **Proyecto:** 4adra  
> **Versión:** 2.0  
> **Base de datos:** Cloudflare D1 (SQLite), ADR-015  
> **Estado:** Draft

## Objetivo y principios

Define el esquema relacional de D1. Principios:

- Llaves foráneas reales y restricciones `CHECK`/`UNIQUE` como primera línea de integridad.
- Índices para las consultas frecuentes.
- Escrituras atómicas con `db.batch([...])`.
- Ningún dato financiero duplicado como fuente de verdad.

Todo cambio de esquema se hace con una **migración nueva** y se documenta aquí.

El esquema completo de referencia está en [`docs/examples/D1Schema.sql`](examples/D1Schema.sql). Las tablas que existen hoy están en [`backend/migrations/`](../backend/migrations/).

## Convenciones

- **Nombres:** tablas y columnas en `snake_case`. Las tablas de Better Auth (`user`, `session`, `account`, `verification`) conservan los nombres camelCase que exige la librería.
- **IDs:** `TEXT PRIMARY KEY` con UUID v7 generado en el backend; nunca incrementales. El `UserId` del dominio es el `user.id` de Better Auth.
- **Fechas de dominio:** `TEXT` ISO-8601 UTC con milisegundos (`2026-11-11T15:04:05.000Z`). Ordenan y comparan correctamente como texto.
- **Dinero:** `amount`, `original_amount`, `converted_amount`, `exchange_rate`, `paid`, `consumed`, `balance` y `percentage` se guardan como `TEXT` decimal exacto (`"500.00"`), **nunca `REAL`**. Los valida el value object `Money` con `Decimal.js`. `shares` es `INTEGER`.
- **Monedas:** ISO-4217 (`USD`, `COP`, `EUR`, `MXN`, `GTQ`).
- **Soft delete:** `status` con `CHECK (status IN ('ACTIVE','ARCHIVED','DELETED'))`. Nunca se borran físicamente la auditoría, las liquidaciones confirmadas ni las tasas históricas.
- **Integridad referencial:** `PRAGMA foreign_keys` está activo en D1.

## Tablas existentes (`0001_init.sql`, `0002_allowed_emails.sql`)

| Tabla | Dueño | Propósito |
|---|---|---|
| `user`, `session`, `account`, `verification` | Better Auth (ADR-016) | Identidad de Google, sesiones (cookie) y cuentas vinculadas |
| `users` | Dominio | Perfil: nombre visible, correo, foto, moneda preferida, idioma, zona horaria, estado (`ACTIVE`/`DISABLED`). `id` → `user(id)` con `ON DELETE RESTRICT` |
| `audit_logs` | Dominio | Auditoría de solo inserción: `actor_id`, `entity`, `entity_id`, `operation`, `request_id`, `occurred_at`, `created_at` |
| `allowed_emails` (`0002`) | Dominio | Lista de acceso (ADR-018): `email` en minúsculas (`CHECK`), `note`, `created_at`, `revoked_at`. Solo los correos vigentes pueden registrar una cuenta nueva |

`audit_logs` tiene los triggers `audit_logs_no_update` y `audit_logs_no_delete` (`RAISE(ABORT, 'audit_logs es inmutable')`). Así la base misma impide alterar la auditoría (ADR-006).

## Grupos y membresías (migración `0003_groups`, pieza 2)

| Tabla | Claves e integridad | Notas |
|---|---|---|
| `groups` | FK `created_by` → `users`; `CHECK` sobre la longitud del nombre (1 a 120), la descripción (hasta 500) y la moneda (COP, USD, EUR, MXN o GTQ) | Estado `ACTIVE`/`ARCHIVED`; `version` para `If-Match`. El perfil de cálculo se agrega con los gastos |
| `group_members` | `UNIQUE (group_id, user_id)`; FK a `groups` y `users`; índice `(user_id, status)` | Rol `OWNER`/`ADMINISTRATOR`/`MEMBER`/`READ_ONLY`; estado `ACTIVE`/`REMOVED`. Reemplaza el ID determinista de ADR-010 |

El grupo y la membresía Owner de quien lo crea se insertan en el mismo `db.batch`.

## Tablas previstas (se crean en la fase que las implemente)

| Tabla | Claves e integridad | Notas |
|---|---|---|
| `calculation_profiles` | PK `(id, version)` | Versiones publicadas inmutables (trigger), ADR-005 |
| `groups` (columnas pendientes) | FK `(calculation_profile_id, calculation_profile_version)` | Se agregan con los gastos (pieza 3) |
| `invitations` | FK `group_id`; índices `(group_id, status)`, `(email, status)` | Una invitación aceptada o rechazada no se borra: conserva su estado final |
| `categories` | — | Catálogo global gestionado por la plataforma |
| `exchange_rates` | Índice `(from_currency, to_currency, captured_at)` | Una tasa usada no cambia (triggers) |
| `expenses` | FK `group_id`, `paid_by`, `category_id`, `created_by` | Exactamente un pagador; tasa y versión de perfil congeladas al crear |
| `expense_splits` | `UNIQUE (expense_id, user_id)` | Se escriben en el mismo `batch` que el gasto |
| `settlements` | `CHECK (from_user <> to_user)` | Estados `PENDING`/`CONFIRMED`/`REJECTED`/`CANCELLED` |
| `balances` | PK `(group_id, user_id)` | Proyección regenerable; nunca se edita manualmente |
| `notifications` | Índice `(user_id, created_at)` | Usuario, título, mensaje, lectura y fecha |
| `app_settings` | — | JSON de monedas, regionalización, límites (ADR-011) y versiones mínimas |

## Índices

**Existentes:**
- `session_userId_idx`, `account_userId_idx`, `verification_identifier_idx`
- `idx_audit_logs_entity (entity, entity_id)`

**Previstos:**

| Tabla | Índices |
|---|---|
| `expenses` | `(group_id, expense_date)`, `(group_id, category_id)`, `(group_id, paid_by)`, `(group_id, status)` |
| `settlements` | `(group_id, status)`, `(from_user, status)`, `(to_user, status)` |
| `group_members` | `(user_id, status)` (el `UNIQUE (group_id, user_id)` ya indexa la otra consulta) |
| `invitations` | `(group_id, status)`, `(email, status)` |

## Atomicidad

D1 no ofrece transacciones interactivas: no se puede leer y luego escribir dentro de una misma transacción. Las operaciones de varias filas se envían como un único `db.batch([...])`, que es atómico; un ejemplo es un gasto junto con sus splits.

Las validaciones que necesitan leer antes de escribir se hacen en el caso de uso y se protegen con restricciones de la base. Por ejemplo, `UNIQUE` evita una membresía duplicada aunque haya dos solicitudes concurrentes.

## Migraciones

- **Ubicación:** `backend/migrations/NNNN_descripcion.sql`, numeradas y aplicadas en orden por Wrangler (tabla interna `d1_migrations`).
- **Comandos:**
  - Local: `npm run db:migrate:local`.
  - Producción: `npm run db:migrate:remote`, que CI ejecuta antes de `wrangler deploy` en `main`.
- **Inmutabilidad:** una migración aplicada **nunca se edita**. Para corregirla se crea otra.
- **Compatibilidad:** se mantiene cuando sea posible (agregar columnas con default, evitar renombrados destructivos). Una migración con impacto en datos se registra en `Decisions.md`.
- **Pruebas:** las de integración aplican todas las migraciones sobre una D1 local antes de cada archivo (`test/integration/applyMigrations.ts`).

## Denormalización

Solo se denormaliza cuando reduce lecturas de forma significativa y la sincronización está clara; por ejemplo, el nombre del grupo en una notificación. Los datos financieros no se duplican como fuente de verdad.
