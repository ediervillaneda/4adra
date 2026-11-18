-- 0006_expenses: perfil de cálculo, gastos y repartos (pieza 3, docs/DatabaseSchema.md).

-- Una versión publicada de un perfil es inmutable (ADR-005): cada gasto guarda la versión con la
-- que se calculó, y activar un perfil nuevo nunca altera resultados históricos.
CREATE TABLE calculation_profiles (
  id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  name TEXT NOT NULL,
  split_strategy TEXT NOT NULL,
  balance_strategy TEXT NOT NULL,
  settlement_strategy TEXT NOT NULL,
  currency_strategy TEXT NOT NULL,
  rounding_strategy TEXT NOT NULL,
  published_at TEXT NOT NULL,
  PRIMARY KEY (id, version)
);

CREATE TRIGGER calculation_profiles_no_update
BEFORE UPDATE ON calculation_profiles
BEGIN
  SELECT RAISE(ABORT, 'Un perfil de cálculo publicado es inmutable.');
END;

CREATE TRIGGER calculation_profiles_no_delete
BEFORE DELETE ON calculation_profiles
BEGIN
  SELECT RAISE(ABORT, 'Un perfil de cálculo publicado es inmutable.');
END;

INSERT INTO calculation_profiles
  (id, version, name, split_strategy, balance_strategy, settlement_strategy, currency_strategy,
   rounding_strategy, published_at)
VALUES
  ('default', 1, 'Predeterminado', 'EQUAL', 'CLASSIC', 'MINIMUM_TRANSACTIONS', 'HISTORIC_RATE',
   'HALF_EVEN', '2026-11-18T00:00:00.000Z');

-- Perfil activo de cada grupo; los existentes y los nuevos quedan en la versión 1. SQLite no
-- permite sumar una FK compuesta con ALTER TABLE: la referencia la exige `expenses`.
ALTER TABLE groups ADD COLUMN calculation_profile_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE groups ADD COLUMN calculation_profile_version INTEGER NOT NULL DEFAULT 1;

-- Gastos (docs/domain/Expense.md): exactamente un pagador; tasa, monto convertido y versión del
-- perfil quedan congelados al crear. La clave de idempotencia es única por autor: un reintento
-- con la misma clave y el mismo contenido (request_fingerprint) devuelve el gasto ya creado.
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  paid_by TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  currency TEXT NOT NULL CHECK (currency IN ('COP', 'USD', 'EUR', 'MXN', 'GTQ')),
  exchange_rate TEXT NOT NULL,
  original_amount TEXT NOT NULL,
  converted_amount TEXT NOT NULL,
  split_type TEXT NOT NULL
    CHECK (split_type IN ('EQUAL', 'EXACT_AMOUNT', 'PERCENTAGE', 'SHARES', 'CUSTOM')),
  calculation_profile_id TEXT NOT NULL,
  calculation_profile_version INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DELETED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  FOREIGN KEY (calculation_profile_id, calculation_profile_version)
    REFERENCES calculation_profiles (id, version),
  UNIQUE (created_by, idempotency_key)
);

CREATE INDEX idx_expenses_group_status_date ON expenses (group_id, status, expense_date);

-- Parte de cada participante; se escriben en el mismo batch que el gasto y suman su monto exacto.
CREATE TABLE expense_splits (
  expense_id TEXT NOT NULL REFERENCES expenses (id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  amount TEXT NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);
