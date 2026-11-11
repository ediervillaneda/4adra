-- 0002_allowed_emails: acceso solo por lista (ADR-018). Inscripción manual con wrangler d1 execute
-- (ver docs/Deployment.md). Solo afecta el registro de cuentas nuevas; los usuarios existentes siguen entrando.
CREATE TABLE allowed_emails (
  email TEXT PRIMARY KEY CHECK (email = lower(trim(email))),
  note TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
