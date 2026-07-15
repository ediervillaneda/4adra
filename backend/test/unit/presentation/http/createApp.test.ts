import { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../../../src/presentation/http/createApp';
import { AuthenticationProvider } from '../../../../src/domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../../../src/domain/audit/AuditLogWriter';
import { UserRepository } from '../../../../src/domain/user/UserRepository';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { GetCurrentUserProfileUseCase } from '../../../../src/application/user/GetCurrentUserProfileUseCase';
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';
import { Email } from '../../../../src/domain/user/Email';

class InMemoryUserRepository implements UserRepository {
  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

function buildApp(): Express {
  const authenticationProvider: AuthenticationProvider = {
    verifyIdToken: jest.fn().mockImplementation((token: string) => {
      if (token !== 'valid-token') {
        return Promise.reject(new UnauthenticatedException('token inválido.'));
      }
      return Promise.resolve({
        userId: UserId.fromString('usr_ana'),
        email: Email.fromString('ana@example.com'),
        displayName: 'Ana Pérez',
        photoUrl: null,
      });
    }),
  };
  const auditLogWriter: AuditLogWriter = { write: jest.fn().mockResolvedValue(undefined) };
  const getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(
    new InMemoryUserRepository(),
    () => new Date('2026-07-13T12:00:00Z'),
  );

  return createApp({ authenticationProvider, auditLogWriter, getCurrentUserProfileUseCase });
}

interface MeSuccessBody {
  data: { id: string; displayName: string; email: string; status: string };
  meta: { requestId: string };
}

interface MeErrorBody {
  error: { code: string };
}

describe('GET /v1/me', () => {
  it('shouldReturn401WhenAuthorizationHeaderIsMissing', async () => {
    const app = buildApp();

    const response = await request(app).get('/v1/me');
    const body = response.body as MeErrorBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('shouldReturn200WithCreatedProfileWhenTokenIsValid', async () => {
    const app = buildApp();

    const response = await request(app).get('/v1/me').set('Authorization', 'Bearer valid-token');
    const body = response.body as MeSuccessBody;

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      id: 'usr_ana',
      displayName: 'Ana Pérez',
      email: 'ana@example.com',
      status: 'ACTIVE',
    });
    expect(body.meta.requestId).toEqual(expect.any(String));
  });
});
