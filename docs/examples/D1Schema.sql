-- Esquema de referencia completo de 4adra en Cloudflare D1 (SQLite). NO se ejecuta:
-- documenta el destino. Las tablas se crean con migraciones numeradas en
-- backend/migrations/ en la fase que las implemente (ver docs/DatabaseSchema.md).
-- Hoy existen: "user", session, account, verification (Better Auth), users y audit_logs
-- (backend/migrations/0001_init.sql).
--
-- Convenciones:
--   * IDs: TEXT con UUID v7 generado en el backend; nunca incrementales.
--   * Fechas de dominio: TEXT ISO-8601 UTC con milisegundos ('2026-11-11T15:04:05.000Z').
--   * Montos, tasas y porcentajes: TEXT decimal exacto ('500.00'), nunca REAL.
--   * Soft delete: status IN ('ACTIVE','ARCHIVED','DELETED'); auditoría, liquidaciones
--     confirmadas y tasas históricas nunca se borran físicamente.
--   * PRAGMA foreign_keys está activo en D1.

CREATE TABLE users (
  id TEXT PRIMARY KEY REFERENCES "user" ("id") ON DELETE RESTRICT,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,
  preferred_currency TEXT NOT NULL,
  language TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE calculation_profiles (
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  split_strategy TEXT NOT NULL,
  balance_strategy TEXT NOT NULL,
  settlement_strategy TEXT NOT NULL,
  currency_strategy TEXT NOT NULL,
  rounding_strategy TEXT NOT NULL,
  published_at TEXT NOT NULL,
  PRIMARY KEY (id, version)
  -- Una versión publicada es inmutable (ADR-005): un trigger BEFORE UPDATE la bloquea.
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT,
  default_currency TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users (id),
  calculation_profile_id TEXT NOT NULL,
  calculation_profile_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (calculation_profile_id, calculation_profile_version)
    REFERENCES calculation_profiles (id, version)
);

CREATE TABLE group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
  invited_at TEXT,
  joined_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (group_id, user_id) -- reemplaza al ID determinista del ADR-010
);
CREATE INDEX idx_group_members_user_status ON group_members (user_id, status);

CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMINISTRATOR', 'MEMBER', 'READ_ONLY')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED')),
  created_by TEXT NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_invitations_group_status ON invitations (group_id, status);
CREATE INDEX idx_invitations_email_status ON invitations (email, status);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE exchange_rates (
  id TEXT PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate TEXT NOT NULL, -- decimal exacto
  provider TEXT NOT NULL,
  captured_at TEXT NOT NULL
  -- Una tasa usada no cambia: triggers BEFORE UPDATE/DELETE la bloquean.
);
CREATE INDEX idx_exchange_rates_pair ON exchange_rates (from_currency, to_currency, captured_at);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES categories (id),
  paid_by TEXT NOT NULL REFERENCES users (id), -- exactamente un pagador
  currency TEXT NOT NULL,
  exchange_rate TEXT NOT NULL, -- congelada al crear el gasto
  original_amount TEXT NOT NULL,
  converted_amount TEXT NOT NULL,
  calculation_profile_version INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users (id),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DELETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_expenses_group_date ON expenses (group_id, expense_date);
CREATE INDEX idx_expenses_group_category ON expenses (group_id, category_id);
CREATE INDEX idx_expenses_group_paid_by ON expenses (group_id, paid_by);
CREATE INDEX idx_expenses_group_status ON expenses (group_id, status);

CREATE TABLE expense_splits (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES expenses (id),
  group_id TEXT NOT NULL REFERENCES groups (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  split_type TEXT NOT NULL CHECK (split_type IN ('EQUAL', 'EXACT_AMOUNT', 'PERCENTAGE', 'SHARES', 'CUSTOM')),
  amount TEXT NOT NULL,
  percentage TEXT,
  shares INTEGER,
  UNIQUE (expense_id, user_id)
  -- Gasto + splits se escriben juntos con db.batch([...]) (atómico).
);

CREATE TABLE settlements (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id),
  from_user TEXT NOT NULL REFERENCES users (id),
  to_user TEXT NOT NULL REFERENCES users (id),
  currency TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED')),
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  CHECK (from_user <> to_user)
);
CREATE INDEX idx_settlements_group_status ON settlements (group_id, status);
CREATE INDEX idx_settlements_from_status ON settlements (from_user, status);
CREATE INDEX idx_settlements_to_status ON settlements (to_user, status);

-- Proyección regenerable: nunca se edita a mano; se recalcula desde gastos/splits/liquidaciones.
CREATE TABLE balances (
  group_id TEXT NOT NULL REFERENCES groups (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  paid TEXT NOT NULL,
  consumed TEXT NOT NULL,
  balance TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  -- Solo inserción: triggers audit_logs_no_update / audit_logs_no_delete (0001_init.sql).
);

CREATE TABLE app_settings (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON: monedas, regionalización, límites, versiones mínimas
  updated_at TEXT NOT NULL
);
