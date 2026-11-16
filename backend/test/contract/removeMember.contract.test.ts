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

type SchemaName = 'Membership' | 'Error';

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

describe('Contrato de remover a un miembro contra docs/api/openapi.yaml', () => {
  it('deleteMemberResponsesShouldMatchOpenApi', async () => {
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
    const expectError = async (response: Response, status: number, code: string): Promise<void> => {
      expect(response.status).toBe(status);
      const errorBody: { error: { code: string } } = await response.json();
      expect(errorBody.error.code).toBe(code);
      expectValid(schemaValidator('Error'), errorBody);
    };

    const group: { data: { id: string } } = await (
      await call('/api/v1/groups', 'POST', { name: 'Casa', defaultCurrency: 'COP' })
    ).json();
    const members = `/api/v1/groups/${group.data.id}/members`;
    const link: { data: { code: string } } = await (
      await call(`${members}/invite-link`, 'POST')
    ).json();
    actor = actorFor('usr_juan', 'Juan');
    await call(`/api/v1/invite-links/${link.data.code}/join`, 'POST');

    await expectError(await call(`${members}/usr_ana`, 'DELETE'), 403, 'PERMISSION_DENIED');
    await expectError(await call(`${members}/usr_juan`, 'DELETE'), 409, 'CANNOT_REMOVE_SELF');

    actor = actorFor('usr_ana', 'Ana');
    const removed = await call(`${members}/usr_juan`, 'DELETE');
    expect(removed.status).toBe(200);
    const removedBody: { data: { status: string } } = await removed.json();
    expect(removedBody.data.status).toBe('REMOVED');
    expectValid(schemaValidator('Membership'), removedBody.data);

    await expectError(await call(`${members}/usr_juan`, 'DELETE'), 404, 'MEMBER_NOT_FOUND');

    actor = actorFor('usr_eva', 'Eva');
    await expectError(await call(`${members}/usr_ana`, 'DELETE'), 404, 'GROUP_NOT_FOUND');
  });
});
