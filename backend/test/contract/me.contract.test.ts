import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import { createApp } from '../../src/presentation/http/createApp';
import { AuthenticationProvider } from '../../src/domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../src/domain/audit/AuditLogWriter';
import { UserRepository } from '../../src/domain/user/UserRepository';
import { User } from '../../src/domain/user/User';
import { GetCurrentUserProfileUseCase } from '../../src/application/user/GetCurrentUserProfileUseCase';
import { UpdateCurrentUserProfileUseCase } from '../../src/application/user/UpdateCurrentUserProfileUseCase';
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';
import { inMemoryGroupUseCases } from '../support/inMemoryGroupUseCases';

class InMemoryUserRepository implements UserRepository {
  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

interface MeContractBody {
  data: unknown;
  meta: { requestId: string };
}

describe('Contrato GET /api/v1/me contra docs/api/openapi.yaml', () => {
  it('shouldMatchTheUserSchemaDefinedInOpenapi', async () => {
    const openapiPath = path.resolve(__dirname, '../../../docs/api/openapi.yaml');
    const openapiDocument = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as Record<
      string,
      unknown
    >;

    const ajv = new Ajv({ strict: false });
    ajv.addSchema(openapiDocument, 'openapi.yaml');
    const validateUser = ajv.getSchema('openapi.yaml#/components/schemas/User');
    if (!validateUser) {
      throw new Error('No se pudo resolver components/schemas/User en openapi.yaml');
    }

    const authenticationProvider: AuthenticationProvider = {
      resolveSession: () =>
        Promise.resolve({
          actor: {
            userId: UserId.fromString('usr_ana'),
            email: Email.fromString('ana@example.com'),
            displayName: 'Ana Pérez',
            photoUrl: null,
          },
          renewedCredentials: [],
        }),
    };
    const auditLogWriter: AuditLogWriter = { write: () => Promise.resolve() };
    const getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(
      new InMemoryUserRepository(),
      () => new Date('2026-07-13T12:00:00Z'),
    );
    const app = createApp({
      authenticationProvider,
      auditLogWriter,
      getCurrentUserProfileUseCase,
      updateCurrentUserProfileUseCase: new UpdateCurrentUserProfileUseCase(
        new InMemoryUserRepository(),
        () => new Date('2026-07-13T12:00:00Z'),
      ),
      ...inMemoryGroupUseCases(),
      authHandler: () => Promise.resolve(new Response(null, { status: 404 })),
      generateRequestId: () => crypto.randomUUID(),
    });

    const response = await app.request(
      '/api/v1/me',
      { headers: { cookie: 'better-auth.session_token=valid' } },
      {},
      { waitUntil: () => undefined, passThroughOnException: () => undefined, props: {} },
    );
    const body: MeContractBody = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.meta.requestId).toBe('string');
    expect(body.meta.requestId.length).toBeGreaterThan(0);

    const isValid = validateUser(body.data);
    if (!isValid) {
      throw new Error(
        `Respuesta no cumple el esquema User: ${JSON.stringify(validateUser.errors)}`,
      );
    }
    expect(isValid).toBe(true);
  });
});
