import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { D1AllowedEmailRepository } from '../../src/infrastructure/d1/D1AllowedEmailRepository';
import { Email } from '../../src/domain/user/Email';

describe('D1AllowedEmailRepository (integración con D1 local)', () => {
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM allowed_emails').run();
    await env.DB.prepare(
      `INSERT INTO allowed_emails (email, note, created_at, revoked_at) VALUES
       ('ana@example.com', 'Ana', '2026-11-11T00:00:00.000Z', NULL),
       ('bruno@example.com', 'Bruno', '2026-11-11T00:00:00.000Z', '2026-11-12T00:00:00.000Z')`,
    ).run();
  });

  it('shouldAllowListedEmail', async () => {
    const repository = new D1AllowedEmailRepository(env.DB);

    expect(await repository.isAllowed(Email.fromString('ana@example.com'))).toBe(true);
  });

  it('shouldAllowListedEmailRegardlessOfCase', async () => {
    const repository = new D1AllowedEmailRepository(env.DB);

    expect(await repository.isAllowed(Email.fromString('  Ana@Example.COM '))).toBe(true);
  });

  it('shouldRejectUnlistedEmail', async () => {
    const repository = new D1AllowedEmailRepository(env.DB);

    expect(await repository.isAllowed(Email.fromString('eve@example.com'))).toBe(false);
  });

  it('shouldRejectRevokedEmail', async () => {
    const repository = new D1AllowedEmailRepository(env.DB);

    expect(await repository.isAllowed(Email.fromString('bruno@example.com'))).toBe(false);
  });

  it('shouldRejectNonLowercaseInsertAtDatabaseLevel', async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO allowed_emails (email, created_at) VALUES ('Mixed@Example.com', '2026-11-11T00:00:00.000Z')",
      ).run(),
    ).rejects.toThrow();
  });
});
