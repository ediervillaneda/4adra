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

function schemaValidator(schema: 'Invitation' | 'ReceivedInvitation'): ValidateFunction {
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

const ana = actorFor('usr_ana', 'Ana');
const juan = actorFor('usr_juan', 'Juan');

const executionContext = {
  waitUntil: (): void => undefined,
  passThroughOnException: (): void => undefined,
  props: {},
};

/** App en memoria donde Ana crea "Casa" y le envía a Juan dos invitaciones; responde Juan. */
async function appWithInvitationsForJuan(): Promise<{
  call: (path: string, method?: string) => Promise<Response>;
  invitationIds: string[];
}> {
  const now = (): Date => new Date('2026-11-12T15:00:00Z');
  const users = new InMemoryUserRepository();
  let actor = ana;
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

  const invitationIds: string[] = [];
  for (const name of ['Casa', 'Playa']) {
    const group: { data: { id: string } } = await (
      await call('/api/v1/groups', 'POST', { name, defaultCurrency: 'COP' })
    ).json();
    const invitation: { data: { invitationId: string } } = await (
      await call(`/api/v1/groups/${group.data.id}/members/invitations`, 'POST', {
        email: 'juan@example.com',
        role: 'MEMBER',
      })
    ).json();
    invitationIds.push(invitation.data.invitationId);
  }
  actor = juan;
  return { call: (requestPath, method) => call(requestPath, method), invitationIds };
}

describe('Contrato /api/v1/invitations contra docs/api/openapi.yaml', () => {
  it('getInvitationsResponseShouldMatchOpenApi', async () => {
    const validate = schemaValidator('ReceivedInvitation');
    const { call } = await appWithInvitationsForJuan();

    const response = await call('/api/v1/invitations');
    const body: { data: unknown[] } = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    body.data.forEach((invitation) => {
      expectValid(validate, invitation);
    });
  });

  it('acceptAndDeclineResponsesShouldMatchOpenApi', async () => {
    const validate = schemaValidator('Invitation');
    const { call, invitationIds } = await appWithInvitationsForJuan();
    const [casa, playa] = invitationIds as [string, string];

    for (const response of [
      await call(`/api/v1/invitations/${casa}/accept`, 'POST'),
      await call(`/api/v1/invitations/${playa}/decline`, 'POST'),
    ]) {
      const body: { data: unknown } = await response.json();

      expect(response.status).toBe(200);
      expectValid(validate, body.data);
    }
  });
});
