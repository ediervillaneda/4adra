-- 0003_groups: grupos y membresías (pieza 2, docs/DatabaseSchema.md). El perfil de cálculo
-- se agrega en una migración posterior, junto con los gastos.
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR length(description) <= 500),
  default_currency TEXT NOT NULL CHECK (default_currency IN ('COP', 'USD', 'EUR', 'MXN', 'GTQ')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'REMOVED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  joined_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_user_status ON group_members (user_id, status);
