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

type SchemaName = 'Expense' | 'Error';

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

describe('Contrato de gastos contra docs/api/openapi.yaml', () => {
  it('expenseResponsesShouldMatchOpenApi', async () => {
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
    const call = (
      requestPath: string,
      method = 'GET',
      body?: unknown,
      idempotencyKey: string = crypto.randomUUID(),
    ): Promise<Response> =>
      Promise.resolve(
        app.request(
          requestPath,
          {
            method,
            headers: {
              cookie: 'better-auth.session_token=valid',
              'content-type': 'application/json',
              'idempotency-key': idempotencyKey,
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
      await call('/api/v1/groups', 'POST', { name: 'Casa', defaultCurrency: 'USD' })
    ).json();
    const expenses = `/api/v1/groups/${group.data.id}/expenses`;
    const hotel = {
      title: 'Hotel',
      description: null,
      paidBy: 'usr_ana',
      amount: '100.00',
      currency: 'USD',
      expenseDate: '2026-11-12T00:00:00Z',
      split: { type: 'EQUAL', participants: [{ userId: 'usr_ana' }] },
    };

    const created = await call(expenses, 'POST', hotel);
    expect(created.status).toBe(201);
    const createdBody: { data: unknown } = await created.json();
    expectValid(schemaValidator('Expense'), createdBody.data);

    const listed = await call(expenses);
    expect(listed.status).toBe(200);
    const listBody: { data: unknown[] } = await listed.json();
    expect(listBody.data).toHaveLength(1);
    expectValid(schemaValidator('Expense'), listBody.data[0]);

    await expectError(
      await call(expenses, 'POST', { ...hotel, amount: '0' }),
      400,
      'INVALID_AMOUNT',
    );
    await expectError(
      await call(expenses, 'POST', { ...hotel, split: { type: 'EQUAL', participants: [] } }),
      400,
      'INVALID_SPLIT',
    );
    await expectError(
      await call(expenses, 'POST', { ...hotel, title: '' }),
      400,
      'VALIDATION_ERROR',
    );
    await expectError(
      await call(expenses, 'POST', { ...hotel, currency: 'COP' }),
      422,
      'CURRENCY_MISMATCH',
    );
    await expectError(
      await call(expenses, 'POST', { ...hotel, paidBy: 'usr_zoe' }),
      422,
      'MEMBER_NOT_ACTIVE',
    );
    const key = crypto.randomUUID();
    await call(expenses, 'POST', hotel, key);
    await expectError(
      await call(expenses, 'POST', { ...hotel, amount: '5.00' }, key),
      409,
      'IDEMPOTENCY_CONFLICT',
    );

    actor = actorFor('usr_eva', 'Eva');
    await expectError(await call(expenses, 'POST', hotel), 404, 'GROUP_NOT_FOUND');
    await expectError(await call(expenses), 404, 'GROUP_NOT_FOUND');

    actor = actorFor('usr_ana', 'Ana');
    await call(`/api/v1/groups/${group.data.id}/archive`, 'POST');
    await expectError(await call(expenses, 'POST', hotel), 409, 'GROUP_ARCHIVED');
  });
});
