import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/presentation/http/createApp';
import { GetCurrentUserProfileUseCase } from '../../src/application/user/GetCurrentUserProfileUseCase';
import { UpdateCurrentUserProfileUseCase } from '../../src/application/user/UpdateCurrentUserProfileUseCase';
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';
import { InMemoryUserRepository } from '../support/InMemoryUserRepository';

describe('Contrato PATCH /api/v1/me contra docs/api/openapi.yaml', () => {
  it('shouldReturnTheUserSchemaAfterUpdatingAllowedFields', async () => {
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

    const repository = new InMemoryUserRepository();
    const now = (): Date => new Date('2026-11-11T18:00:00Z');
    const app = createApp({
      authenticationProvider: {
        resolveSession: () =>
          Promise.resolve({
            userId: UserId.fromString('usr_ana'),
            email: Email.fromString('ana@example.com'),
            displayName: 'Ana Pérez',
            photoUrl: null,
          }),
      },
      auditLogWriter: { write: () => Promise.resolve() },
      getCurrentUserProfileUseCase: new GetCurrentUserProfileUseCase(repository, now),
      updateCurrentUserProfileUseCase: new UpdateCurrentUserProfileUseCase(repository, now),
      authHandler: () => Promise.resolve(new Response(null, { status: 404 })),
      generateRequestId: () => crypto.randomUUID(),
    });

    const response = await app.request(
      '/api/v1/me',
      {
        method: 'PATCH',
        headers: { cookie: 'better-auth.session_token=valid', 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Ana P.', timeZone: 'America/Bogota' }),
      },
      {},
      { waitUntil: () => undefined, passThroughOnException: () => undefined, props: {} },
    );
    const body: { data: unknown } = await response.json();

    expect(response.status).toBe(200);
    const isValid = validateUser(body.data);
    if (!isValid) {
      throw new Error(
        `Respuesta no cumple el esquema User: ${JSON.stringify(validateUser.errors)}`,
      );
    }
    expect(isValid).toBe(true);
  });
});
