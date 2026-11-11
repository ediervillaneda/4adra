import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import {
  authenticateMiddleware,
  AuthenticatedRequest,
} from '../../../../../src/presentation/http/middleware/authenticate';
import { AuthenticationProvider } from '../../../../../src/domain/auth/AuthenticationProvider';
import { UnauthenticatedException } from '../../../../../src/domain/auth/errors';
import { UserId } from '../../../../../src/domain/user/UserId';
import { Email } from '../../../../../src/domain/user/Email';

function requestWithHeader(value: string | undefined): Request {
  return { header: () => value } as unknown as Request;
}

describe('authenticateMiddleware', () => {
  it('shouldCallNextWithUnauthenticatedWhenCookieIsMissing', async () => {
    const provider: AuthenticationProvider = {
      resolveSession: vi
        .fn()
        .mockRejectedValue(new UnauthenticatedException('falta la cookie de sesión.')),
    };
    const middleware = authenticateMiddleware(provider);
    const next = vi.fn();

    await middleware(requestWithHeader(undefined), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });

  it('shouldCallNextWithUnauthenticatedWhenCookieIsBlank', async () => {
    const provider: AuthenticationProvider = {
      resolveSession: vi
        .fn()
        .mockRejectedValue(new UnauthenticatedException('falta la cookie de sesión.')),
    };
    const middleware = authenticateMiddleware(provider);
    const next = vi.fn();

    await middleware(requestWithHeader('   '), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });

  it('shouldAttachActorAndCallNextWhenTokenIsValid', async () => {
    const actor = {
      userId: UserId.fromString('usr_ana'),
      email: Email.fromString('ana@example.com'),
      displayName: 'Ana Pérez',
      photoUrl: null,
    };
    const provider: AuthenticationProvider = { resolveSession: vi.fn().mockResolvedValue(actor) };
    const middleware = authenticateMiddleware(provider);
    const req = requestWithHeader('better-auth.session_token=abc');
    const next = vi.fn();

    await middleware(req, {} as Response, next);

    expect((req as AuthenticatedRequest).actor).toBe(actor);
    expect(next).toHaveBeenCalledWith();
  });

  it('shouldCallNextWithErrorWhenProviderRejects', async () => {
    const provider: AuthenticationProvider = {
      resolveSession: vi.fn().mockRejectedValue(new UnauthenticatedException('expirado')),
    };
    const middleware = authenticateMiddleware(provider);
    const next = vi.fn();

    await middleware(requestWithHeader('better-auth.session_token=expired'), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });
});
