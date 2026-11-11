import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createApp, AppDependencies } from '../../../../src/presentation/http/createApp';
import { AppEnv } from '../../../../src/presentation/http/AppEnv';
import { AuthenticationProvider } from '../../../../src/domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../../../src/domain/audit/AuditLogWriter';
import { UserRepository } from '../../../../src/domain/user/UserRepository';
import { User } from '../../../../src/domain/user/User';
import { GetCurrentUserProfileUseCase } from '../../../../src/application/user/GetCurrentUserProfileUseCase';
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
        userId: UserId.fromString('usr_ana'),
        email: Email.fromString('ana@example.com'),
        displayName: 'Ana Pérez',
        photoUrl: null,
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

  it('shouldNotRequireSessionForAuthRoutes', async () => {
    const resolveSession = vi.fn();

    const response = await buildApp({
      authenticationProvider: { resolveSession },
    }).request('/api/auth/sign-in/social', { method: 'POST' }, {}, executionContextFake());

    expect(response.status).toBe(200);
    expect(resolveSession).not.toHaveBeenCalled();
  });
});
