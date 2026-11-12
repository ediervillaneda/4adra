import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requestIdMiddleware } from '../../../../../src/presentation/http/middleware/requestId';
import { AppEnv } from '../../../../../src/presentation/http/AppEnv';

function appWithGenerator(generate: () => string): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use(requestIdMiddleware(generate));
  app.get('/ping', (c) => c.json({ requestId: c.get('requestId') }));
  return app;
}

describe('requestIdMiddleware', () => {
  it('shouldAssignAUuidRequestIdAndCallNext', async () => {
    const app = appWithGenerator(() => crypto.randomUUID());

    const response = await app.request('/ping');
    const body: { requestId: string } = await response.json();

    expect(response.status).toBe(200);
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('shouldAssignADifferentRequestIdOnEachCall', async () => {
    let sequence = 0;
    const app = appWithGenerator(() => `req_${++sequence}`);

    const first: { requestId: string } = await (await app.request('/ping')).json();
    const second: { requestId: string } = await (await app.request('/ping')).json();

    expect(first.requestId).toBe('req_1');
    expect(second.requestId).toBe('req_2');
  });
});
