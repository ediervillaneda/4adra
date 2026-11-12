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
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';
import { InMemoryUserRepository } from '../support/InMemoryUserRepository';
import { inMemoryGroupUseCases } from '../support/inMemoryGroupUseCases';

function schemaValidator(schema: 'Group' | 'Membership'): ValidateFunction {
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

function buildApp(): Hono<AppEnv> {
  const now = (): Date => new Date('2026-11-12T15:00:00Z');
  const users = new InMemoryUserRepository();
  return createApp({
    authenticationProvider: {
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
    },
    auditLogWriter: { write: () => Promise.resolve() },
    getCurrentUserProfileUseCase: new GetCurrentUserProfileUseCase(users, now),
    updateCurrentUserProfileUseCase: new UpdateCurrentUserProfileUseCase(users, now),
    ...inMemoryGroupUseCases(now),
    authHandler: () => Promise.resolve(new Response(null, { status: 404 })),
    generateRequestId: () => crypto.randomUUID(),
  });
}

const executionContext = {
  waitUntil: (): void => undefined,
  passThroughOnException: (): void => undefined,
  props: {},
};

function request(
  app: Hono<AppEnv>,
  init: RequestInit = {},
  path = '/api/v1/groups',
): Promise<Response> {
  return Promise.resolve(
    app.request(
      path,
      {
        ...init,
        headers: { cookie: 'better-auth.session_token=valid', 'content-type': 'application/json' },
      },
      {},
      executionContext,
    ),
  );
}

function expectValidGroup(validate: ValidateFunction, value: unknown): void {
  if (!validate(value)) {
    throw new Error(`Respuesta no cumple el esquema: ${JSON.stringify(validate.errors)}`);
  }
}

async function createCasa(app: Hono<AppEnv>): Promise<string> {
  const response = await request(app, {
    method: 'POST',
    body: JSON.stringify({ name: 'Casa', defaultCurrency: 'COP' }),
  });
  const body: { data: { id: string } } = await response.json();
  return body.data.id;
}

describe('Contrato /api/v1/groups contra docs/api/openapi.yaml', () => {
  it('postGroupsResponseShouldMatchOpenApi', async () => {
    const validate = schemaValidator('Group');

    const response = await request(buildApp(), {
      method: 'POST',
      body: JSON.stringify({ name: 'Casa', defaultCurrency: 'COP' }),
    });
    const body: { data: unknown } = await response.json();

    expect(response.status).toBe(201);
    expectValidGroup(validate, body.data);
  });

  it('getGroupsResponseShouldMatchOpenApi', async () => {
    const validate = schemaValidator('Group');
    const app = buildApp();
    await request(app, {
      method: 'POST',
      body: JSON.stringify({ name: 'Casa', description: 'Hogar', defaultCurrency: 'COP' }),
    });

    const response = await request(app);
    const body: { data: unknown[] } = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    body.data.forEach((group) => {
      expectValidGroup(validate, group);
    });
  });

  it('getGroupResponseShouldMatchOpenApi', async () => {
    const validate = schemaValidator('Group');
    const app = buildApp();
    const groupId = await createCasa(app);

    const response = await request(app, {}, `/api/v1/groups/${groupId}`);
    const body: { data: unknown } = await response.json();

    expect(response.status).toBe(200);
    expectValidGroup(validate, body.data);
  });

  it('getGroupMembersResponseShouldMatchOpenApi', async () => {
    const validate = schemaValidator('Membership');
    const app = buildApp();
    const groupId = await createCasa(app);

    const response = await request(app, {}, `/api/v1/groups/${groupId}/members`);
    const body: { data: unknown[] } = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    body.data.forEach((member) => {
      expectValidGroup(validate, member);
    });
  });
});
