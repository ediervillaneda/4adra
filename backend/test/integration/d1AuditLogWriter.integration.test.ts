import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { D1AuditLogWriter } from '../../src/infrastructure/d1/D1AuditLogWriter';

interface AuditRow {
  id: string;
  actor_id: string;
  entity: string;
  operation: string;
  request_id: string;
  occurred_at: string;
  created_at: string;
}

describe('D1AuditLogWriter (integración con D1 local)', () => {
  let sequence = 0;
  const generateId = (): string => `log_${++sequence}`;

  beforeEach(async () => {
    const writer = new D1AuditLogWriter(env.DB, generateId);
    await writer.write({
      actorId: 'usr_ana',
      entity: '/api/v1/groups',
      entityId: '/api/v1/groups',
      operation: 'POST',
      requestId: `req-${sequence + 1}`,
      occurredAt: new Date('2026-07-13T12:00:00.000Z'),
    });
  });

  it('shouldInsertAuditEntry', async () => {
    const row = await env.DB.prepare(
      'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 1',
    ).first<AuditRow>();

    expect(row?.id).toMatch(/^log_\d+$/);
    expect(row?.actor_id).toBe('usr_ana');
    expect(row?.entity).toBe('/api/v1/groups');
    expect(row?.operation).toBe('POST');
    expect(row?.occurred_at).toBe('2026-07-13T12:00:00.000Z');
    expect(row?.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('shouldRejectUpdateOnAuditLogs', async () => {
    await expect(env.DB.prepare("UPDATE audit_logs SET operation = 'X'").run()).rejects.toThrow(
      /inmutable/,
    );
  });

  it('shouldRejectDeleteOnAuditLogs', async () => {
    await expect(env.DB.prepare('DELETE FROM audit_logs').run()).rejects.toThrow(/inmutable/);
  });
});
