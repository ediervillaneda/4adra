import express, { Express } from 'express';
import request from 'supertest';
import { auditTrailMiddleware } from '../../../../../src/presentation/http/middleware/auditTrail';
import { AuditLogWriter } from '../../../../../src/domain/audit/AuditLogWriter';
import { requestIdMiddleware } from '../../../../../src/presentation/http/middleware/requestId';

function appWithFakeWriter(writer: AuditLogWriter): Express {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(auditTrailMiddleware(writer));
  app.get('/v1/ping', (_req, res) => res.status(200).json({ ok: true }));
  app.post('/v1/groups', (_req, res) => res.status(201).json({ ok: true }));
  app.post('/v1/fails', (_req, res) => res.status(400).json({ ok: false }));
  return app;
}

describe('auditTrailMiddleware', () => {
  it('shouldNotWriteAuditLogForReadRequests', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const app = appWithFakeWriter({ write });

    await request(app).get('/v1/ping').expect(200);
    await new Promise((resolve) => setImmediate(resolve));

    expect(write).not.toHaveBeenCalled();
  });

  it('shouldWriteAuditLogForSuccessfulMutation', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const app = appWithFakeWriter({ write });

    await request(app).post('/v1/groups').expect(201);
    await new Promise((resolve) => setImmediate(resolve));

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(
      expect.objectContaining({ entity: '/v1/groups', operation: 'POST' }),
    );
  });

  it('shouldNotWriteAuditLogForFailedMutation', async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const app = appWithFakeWriter({ write });

    await request(app).post('/v1/fails').expect(400);
    await new Promise((resolve) => setImmediate(resolve));

    expect(write).not.toHaveBeenCalled();
  });
});
