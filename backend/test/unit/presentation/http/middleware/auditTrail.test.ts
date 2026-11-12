import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { auditTrailMiddleware } from '../../../../../src/presentation/http/middleware/auditTrail';
import { requestIdMiddleware } from '../../../../../src/presentation/http/middleware/requestId';
import { AppEnv } from '../../../../../src/presentation/http/AppEnv';
import { AuditLogWriter } from '../../../../../src/domain/audit/AuditLogWriter';
import { executionContextFake } from '../executionContextFake';

function appWithWriter(writer: AuditLogWriter): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use(requestIdMiddleware(() => 'req_1'));
  app.use(auditTrailMiddleware(writer, () => new Date('2026-07-13T12:00:00.000Z')));
  app.get('/api/v1/ping', (c) => c.json({ ok: true }, 200));
  app.post('/api/v1/groups', (c) => c.json({ ok: true }, 201));
  app.post('/api/v1/fails', (c) => c.json({ ok: false }, 400));
  return app;
}

describe('auditTrailMiddleware', () => {
  it('shouldNotWriteAuditLogForReadRequests', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const ctx = executionContextFake();

    await appWithWriter({ write }).request('/api/v1/ping', {}, {}, ctx);
    await ctx.settle();

    expect(write).not.toHaveBeenCalled();
  });

  it('shouldScheduleAuditWriteWithWaitUntilOnSuccessfulMutation', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const ctx = executionContextFake();

    const response = await appWithWriter({ write }).request(
      '/api/v1/groups',
      { method: 'POST' },
      {},
      ctx,
    );
    await ctx.settle();

    expect(response.status).toBe(201);
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith({
      actorId: 'unknown',
      entity: '/api/v1/groups',
      entityId: '/api/v1/groups',
      operation: 'POST',
      requestId: 'req_1',
      occurredAt: new Date('2026-07-13T12:00:00.000Z'),
    });
  });

  it('shouldNotAuditFailedMutation', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const ctx = executionContextFake();

    await appWithWriter({ write }).request('/api/v1/fails', { method: 'POST' }, {}, ctx);
    await ctx.settle();

    expect(write).not.toHaveBeenCalled();
  });

  it('shouldNotAlterResponseWhenAuditWriteFails', async () => {
    const write = vi.fn().mockRejectedValue(new Error('D1 no disponible'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ctx = executionContextFake();

    const response = await appWithWriter({ write }).request(
      '/api/v1/groups',
      { method: 'POST' },
      {},
      ctx,
    );

    expect(response.status).toBe(201);
    await expect(ctx.settle()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
