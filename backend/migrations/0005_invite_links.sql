-- 0005_invite_links: enlaces de invitación a un grupo (pieza 2, historia #5, docs/DatabaseSchema.md).
-- Solo se guarda el hash SHA-256 del código, nunca el código. Un enlace nunca se borra: al crear
-- otro, el anterior queda con replaced_at. Cada grupo tiene como máximo un enlace sin reemplazar.
CREATE TABLE invite_links (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE RESTRICT,
  code_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  replaced_at TEXT
);

CREATE UNIQUE INDEX idx_invite_links_current_per_group
  ON invite_links (group_id) WHERE replaced_at IS NULL;
