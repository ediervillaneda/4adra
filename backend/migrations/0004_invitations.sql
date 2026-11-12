-- 0004_invitations: invitaciones por correo a un grupo (pieza 2, historia #3, docs/DatabaseSchema.md).
-- Una invitación nunca se borra: conserva su estado final.
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMINISTRATOR', 'MEMBER', 'READ_ONLY')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED')),
  invited_by TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_invitations_group_status ON invitations (group_id, status);
CREATE INDEX idx_invitations_email_status ON invitations (email, status);
