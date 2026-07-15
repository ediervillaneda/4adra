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
  it('shouldCallNextWithUnauthenticatedWhenHeaderIsMissing', async () => {
    const provider: AuthenticationProvider = { verifyIdToken: jest.fn() };
    const middleware = authenticateMiddleware(provider);
    const next = jest.fn();

    await middleware(requestWithHeader(undefined), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });

  it('shouldCallNextWithUnauthenticatedWhenHeaderIsNotBearer', async () => {
    const provider: AuthenticationProvider = { verifyIdToken: jest.fn() };
    const middleware = authenticateMiddleware(provider);
    const next = jest.fn();

    await middleware(requestWithHeader('Basic abc'), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });

  it('shouldAttachActorAndCallNextWhenTokenIsValid', async () => {
    const actor = {
      userId: UserId.fromString('usr_ana'),
      email: Email.fromString('ana@example.com'),
      displayName: 'Ana Pérez',
      photoUrl: null,
    };
    const provider: AuthenticationProvider = { verifyIdToken: jest.fn().mockResolvedValue(actor) };
    const middleware = authenticateMiddleware(provider);
    const req = requestWithHeader('Bearer a-valid-token');
    const next = jest.fn();

    await middleware(req, {} as Response, next);

    expect((req as AuthenticatedRequest).actor).toBe(actor);
    expect(next).toHaveBeenCalledWith();
  });

  it('shouldCallNextWithErrorWhenProviderRejects', async () => {
    const provider: AuthenticationProvider = {
      verifyIdToken: jest.fn().mockRejectedValue(new UnauthenticatedException('expirado')),
    };
    const middleware = authenticateMiddleware(provider);
    const next = jest.fn();

    await middleware(requestWithHeader('Bearer expired-token'), {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthenticatedException));
  });
});
