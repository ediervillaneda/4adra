import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createApp, AppDependencies } from '../../../../src/presentation/http/createApp';
import { AppEnv } from '../../../../src/presentation/http/AppEnv';
import { AuthenticationProvider } from '../../../../src/domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../../../src/domain/audit/AuditLogWriter';
import { UserRepository } from '../../../../src/domain/user/UserRepository';
import { User } from '../../../../src/domain/user/User';
import { GetCurrentUserProfileUseCase } from '../../../../src/application/user/GetCurrentUserProfileUseCase';
import { UpdateCurrentUserProfileUseCase } from '../../../../src/application/user/UpdateCurrentUserProfileUseCase';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { SessionCredential } from '../../../../src/domain/auth/SessionCredential';
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';
import { executionContextFake } from './executionContextFake';

class InMemoryUserRepository implements UserRepository {
  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

const VALID_COOKIE = 'better-auth.session_token=valid';

function buildApp(overrides: Partial<AppDependencies> = {}): Hono<AppEnv> {
  const authenticationProvider: AuthenticationProvider = {
    resolveSession: vi.fn().mockImplementation((credential: SessionCredential) => {
      if (credential.toString() !== VALID_COOKIE) {
        return Promise.reject(new UnauthenticatedException('sesión inválida.'));
      }
      return Promise.resolve({
        actor: {
          userId: UserId.fromString('usr_ana'),
          email: Email.fromString('ana@example.com'),
          displayName: 'Ana Pérez',
          photoUrl: null,
        },
        renewedCredentials: [],
      });
    }),
  };
  const auditLogWriter: AuditLogWriter = { write: vi.fn().mockResolvedValue(undefined) };
  const getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(
    new InMemoryUserRepository(),
    () => new Date('2026-07-13T12:00:00Z'),
  );

  return createApp({
    authenticationProvider,
    auditLogWriter,
    getCurrentUserProfileUseCase,
    updateCurrentUserProfileUseCase: new UpdateCurrentUserProfileUseCase(
      new InMemoryUserRepository(),
      () => new Date('2026-11-11T18:00:00Z'),
    ),
    authHandler: () => Promise.resolve(new Response('auth', { status: 200 })),
    generateRequestId: () => 'req_1',
    ...overrides,
  });
}

interface MeSuccessBody {
  data: { id: string; displayName: string; email: string; status: string };
  meta: { requestId: string };
}

interface ErrorBody {
  error: { code: string };
  meta: { requestId: string };
}

describe('createApp', () => {
  it('shouldReturn401WhenSessionCookieIsMissing', async () => {
    const response = await buildApp().request('/api/v1/me', {}, {}, executionContextFake());
    const body: ErrorBody = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('shouldReturn200WithCreatedProfileWhenTokenIsValid', async () => {
    const response = await buildApp().request(
      '/api/v1/me',
      { headers: { cookie: VALID_COOKIE } },
      {},
      executionContextFake(),
    );
    const body: MeSuccessBody = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      id: 'usr_ana',
      displayName: 'Ana Pérez',
      email: 'ana@example.com',
      status: 'ACTIVE',
    });
    expect(body.meta.requestId).toBe('req_1');
  });

  it('shouldReturnJson404ForUnknownApiRoute', async () => {
    const response = await buildApp().request(
      '/api/v1/nope',
      { headers: { cookie: VALID_COOKIE } },
      {},
      executionContextFake(),
    );
    const body: ErrorBody = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.meta.requestId).toBe('req_1');
  });

  it('shouldRespond500WhenSessionLookupFailsUnexpectedly', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await buildApp({
      authenticationProvider: {
        resolveSession: vi.fn().mockRejectedValue(new Error('D1_ERROR: database unavailable')),
      },
    }).request('/api/v1/me', { headers: { cookie: VALID_COOKIE } }, {}, executionContextFake());
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toMatchObject({
      error: { code: 'INTERNAL_ERROR' },
      meta: { requestId: 'req_1' },
    });
    expect(text).not.toContain('D1_ERROR');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('shouldDelegateAuthRoutesToAuthHandler', async () => {
    const authHandler = vi
      .fn<(request: Request) => Promise<Response>>()
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const response = await buildApp({ authHandler }).request(
      'http://localhost/api/auth/session',
      {},
      {},
      executionContextFake(),
    );

    expect(response.status).toBe(200);
    expect(authHandler).toHaveBeenCalledTimes(1);
    expect(authHandler.mock.calls[0]?.[0].url).toMatch(/\/api\/auth\/session$/);
  });

  it('shouldUpdateProfileWithPatchMe', async () => {
    const ctx = executionContextFake();

    const response = await buildApp().request(
      '/api/v1/me',
      {
        method: 'PATCH',
        headers: { cookie: VALID_COOKIE, 'content-type': 'application/json' },
        body: JSON.stringify({ preferredCurrency: 'EUR', language: 'en' }),
      },
      {},
      ctx,
    );
    const body: MeSuccessBody & { data: { preferredCurrency: string; language: string } } =
      await response.json();
    await ctx.settle();

    expect(response.status).toBe(200);
    expect(body.data.preferredCurrency).toBe('EUR');
    expect(body.data.language).toBe('en');
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
  });

  it('shouldRespond400WithFieldDetailsForInvalidPatch', async () => {
    const response = await buildApp().request(
      '/api/v1/me',
      {
        method: 'PATCH',
        headers: { cookie: VALID_COOKIE, 'content-type': 'application/json' },
        body: JSON.stringify({ language: 'fr', status: 'DISABLED' }),
      },
      {},
      executionContextFake(),
    );
    const body: { error: { code: string; details: unknown[] } } = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual([
      { field: 'status', reason: 'not_allowed' },
      { field: 'language', reason: 'unsupported_language' },
    ]);
  });

  it('shouldRespond400ForMalformedJsonBody', async () => {
    const response = await buildApp().request(
      '/api/v1/me',
      {
        method: 'PATCH',
        headers: { cookie: VALID_COOKIE, 'content-type': 'application/json' },
        body: '{"language": ',
      },
      {},
      executionContextFake(),
    );
    const body: { error: { code: string; details: unknown[] } } = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.details).toEqual([{ field: 'body', reason: 'invalid_json' }]);
  });

  it('shouldNotRequireSessionForAuthRoutes', async () => {
    const resolveSession = vi.fn();

    const response = await buildApp({
      authenticationProvider: { resolveSession },
    }).request('/api/auth/sign-in/social', { method: 'POST' }, {}, executionContextFake());

    expect(response.status).toBe(200);
    expect(resolveSession).not.toHaveBeenCalled();
  });
});
