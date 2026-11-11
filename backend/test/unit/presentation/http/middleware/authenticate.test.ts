import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { authenticateMiddleware } from '../../../../../src/presentation/http/middleware/authenticate';
import { requestIdMiddleware } from '../../../../../src/presentation/http/middleware/requestId';
import { handleError } from '../../../../../src/presentation/http/middleware/errorHandler';
import { AppEnv } from '../../../../../src/presentation/http/AppEnv';
import { AuthenticationProvider } from '../../../../../src/domain/auth/AuthenticationProvider';
import { AuthenticatedActor } from '../../../../../src/domain/auth/AuthenticatedActor';
import { SessionCredential } from '../../../../../src/domain/auth/SessionCredential';
import { UnauthenticatedException } from '../../../../../src/domain/auth/errors';
import { UserId } from '../../../../../src/domain/user/UserId';
import { Email } from '../../../../../src/domain/user/Email';

const actor: AuthenticatedActor = {
  userId: UserId.fromString('usr_ana'),
  email: Email.fromString('ana@example.com'),
  displayName: 'Ana Pérez',
  photoUrl: null,
};

function appWith(provider: AuthenticationProvider): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.use(requestIdMiddleware(() => 'req_1'));
  app.use(authenticateMiddleware(provider));
  app.get('/api/v1/me', (c) => c.json({ userId: c.get('actor').userId.toString() }));
  app.onError(handleError);
  return app;
}

interface ErrorBody {
  error: { code: string };
  meta: { requestId: string };
}

describe('authenticateMiddleware', () => {
  it('shouldRespond401EnvelopeWithoutCookie', async () => {
    const provider: AuthenticationProvider = {
      resolveSession: vi
        .fn()
        .mockRejectedValue(new UnauthenticatedException('falta la cookie de sesión.')),
    };

    const response = await appWith(provider).request('/api/v1/me');
    const body: ErrorBody = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(body.meta.requestId).toBe('req_1');
  });

  it('shouldPassCookieHeaderAsSessionCredential', async () => {
    const resolveSession = vi
      .fn<(credential: SessionCredential) => Promise<AuthenticatedActor>>()
      .mockResolvedValue(actor);

    await appWith({ resolveSession }).request('/api/v1/me', {
      headers: { cookie: 'better-auth.session_token=abc' },
    });

    expect(resolveSession.mock.calls[0]?.[0].toString()).toBe('better-auth.session_token=abc');
  });

  it('shouldAttachActorAndCallNextWhenTokenIsValid', async () => {
    const provider: AuthenticationProvider = { resolveSession: vi.fn().mockResolvedValue(actor) };

    const response = await appWith(provider).request('/api/v1/me', {
      headers: { cookie: 'better-auth.session_token=abc' },
    });
    const body: { userId: string } = await response.json();

    expect(response.status).toBe(200);
    expect(body.userId).toBe('usr_ana');
  });
});
