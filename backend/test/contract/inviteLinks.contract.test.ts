import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import Ajv, { ValidateFunction } from 'ajv';
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createApp } from '../../src/presentation/http/createApp';
import { AppEnv } from '../../src/presentation/http/AppEnv';
import { GetCurrentUserProfileUseCase } from '../../src/application/user/GetCurrentUserProfileUseCase';
import { UpdateCurrentUserProfileUseCase } from '../../src/application/user/UpdateCurrentUserProfileUseCase';
import { AuthenticatedActor } from '../../src/domain/auth/AuthenticatedActor';
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';
import { InMemoryUserRepository } from '../support/InMemoryUserRepository';
import { inMemoryGroupUseCases } from '../support/inMemoryGroupUseCases';

type SchemaName = 'InviteLink' | 'InviteLinkPreview' | 'JoinedMembership';

function schemaValidator(schema: SchemaName): ValidateFunction {
  const openapiPath = path.resolve(__dirname, '../../../docs/api/openapi.yaml');
  const openapiDocument = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as Record<
    string,
    unknown
  >;
  const ajv = new Ajv({ strict: false });
  ajv.addSchema(openapiDocument, 'openapi.yaml');
  const validate = ajv.getSchema(`openapi.yaml#/components/schemas/${schema}`);
  if (!validate) {
    throw new Error(`No se pudo resolver components/schemas/${schema} en openapi.yaml`);
  }
  return validate;
}

function expectValid(validate: ValidateFunction, value: unknown): void {
  if (!validate(value)) {
    throw new Error(`Respuesta no cumple el esquema: ${JSON.stringify(validate.errors)}`);
  }
}

function actorFor(id: string, name: string): AuthenticatedActor {
  return {
    userId: UserId.fromString(id),
    email: Email.fromString(`${name.toLowerCase()}@example.com`),
    displayName: name,
    photoUrl: null,
  };
}

const executionContext = {
  waitUntil: (): void => undefined,
  passThroughOnException: (): void => undefined,
  props: {},
};

describe('Contrato del enlace de invitación contra docs/api/openapi.yaml', () => {
  it('createGetAndJoinResponsesShouldMatchOpenApi', async () => {
    const now = (): Date => new Date('2026-11-12T15:00:00Z');
    const users = new InMemoryUserRepository();
    let actor = actorFor('usr_ana', 'Ana');
    const app: Hono<AppEnv> = createApp({
      authenticationProvider: {
        resolveSession: () => Promise.resolve({ actor, renewedCredentials: [] }),
      },
      auditLogWriter: { write: () => Promise.resolve() },
      getCurrentUserProfileUseCase: new GetCurrentUserProfileUseCase(users, now),
      updateCurrentUserProfileUseCase: new UpdateCurrentUserProfileUseCase(users, now),
      ...inMemoryGroupUseCases(now),
      authHandler: () => Promise.resolve(new Response(null, { status: 404 })),
      generateRequestId: () => crypto.randomUUID(),
    });
    const call = (requestPath: string, method = 'GET', body?: unknown): Promise<Response> =>
      Promise.resolve(
        app.request(
          requestPath,
          {
            method,
            headers: {
              cookie: 'better-auth.session_token=valid',
              'content-type': 'application/json',
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          },
          {},
          executionContext,
        ),
      );

    const group: { data: { id: string } } = await (
      await call('/api/v1/groups', 'POST', { name: 'Casa', defaultCurrency: 'COP' })
    ).json();
    const created = await call(`/api/v1/groups/${group.data.id}/members/invite-link`, 'POST');
    const link: { data: { code: string } } = await created.json();
    expect(created.status).toBe(201);
    expectValid(schemaValidator('InviteLink'), link.data);

    actor = actorFor('usr_juan', 'Juan');
    const preview = await call(`/api/v1/invite-links/${link.data.code}`);
    expect(preview.status).toBe(200);
    const previewBody: { data: unknown } = await preview.json();
    expectValid(schemaValidator('InviteLinkPreview'), previewBody.data);

    const joined = await call(`/api/v1/invite-links/${link.data.code}/join`, 'POST');
    expect(joined.status).toBe(200);
    const joinedBody: { data: unknown } = await joined.json();
    expectValid(schemaValidator('JoinedMembership'), joinedBody.data);
  });
});
