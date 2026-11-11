import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { handleError } from '../../../../../src/presentation/http/middleware/errorHandler';
import { requestIdMiddleware } from '../../../../../src/presentation/http/middleware/requestId';
import { AppEnv } from '../../../../../src/presentation/http/AppEnv';
import { UnauthenticatedException } from '../../../../../src/domain/auth/errors';
import { UserDisabledException } from '../../../../../src/domain/user/errors';

function appThrowing(error: unknown, withRequestId = true): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  if (withRequestId) {
    app.use(requestIdMiddleware(() => 'req_123'));
  }
  app.get('/boom', () => {
    throw error;
  });
  app.onError(handleError);
  return app;
}

interface ErrorBody {
  error: { code: string; message: string };
  meta: { requestId: string };
}

describe('handleError', () => {
  it('shouldMapUnauthenticatedExceptionTo401', async () => {
    const response = await appThrowing(new UnauthenticatedException('falta token.')).request(
      '/boom',
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Solicitud no autenticada: falta token.' },
      meta: { requestId: 'req_123' },
    });
  });

  it('shouldMapUserDisabledExceptionTo403', async () => {
    const response = await appThrowing(new UserDisabledException('usr_ana')).request('/boom');
    const body: ErrorBody = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('USER_DISABLED');
  });

  it('shouldMapUnknownErrorTo500WithInternalErrorCode', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await appThrowing(new Error('boom')).request('/boom');
    const body: ErrorBody = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno inesperado.' },
      meta: { requestId: 'req_123' },
    });
    consoleError.mockRestore();
  });

  it('shouldMapUnexpectedErrorTo500WithoutLeakingMessage', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await appThrowing(new Error('SQLITE_ERROR: no such table')).request('/boom');
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain('SQLITE');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('shouldFallBackToUnknownRequestIdWhenMissing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await appThrowing(new Error('boom'), false).request('/boom');
    const body: ErrorBody = await response.json();

    expect(body.meta.requestId).toBe('unknown');
    consoleError.mockRestore();
  });
});
