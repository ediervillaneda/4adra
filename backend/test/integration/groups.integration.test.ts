import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { sessionCookieFor } from './sessionCookieFor';

const BASE = 'http://localhost:8787/api/v1/groups';

interface GroupBody {
  id: string;
  name: string;
  description: string | null;
  defaultCurrency: string;
  status: string;
  role: string;
}

async function createGroup(cookie: string, body: unknown): Promise<Response> {
  return SELF.fetch(BASE, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function listGroups(cookie: string): Promise<GroupBody[]> {
  const response = await SELF.fetch(BASE, { headers: { cookie } });
  expect(response.status).toBe(200);
  const body: { data: GroupBody[] } = await response.json();
  return body.data;
}

describe('Grupos de punta a punta (Worker + D1 + Better Auth)', () => {
  it('shouldCreateGroupAndListItForCreator', async () => {
    const cookie = await sessionCookieFor('ana.grupos@example.com', 'Ana Pérez');

    const response = await createGroup(cookie, {
      name: 'Viaje Guatemala',
      description: 'Vacaciones 2027',
      defaultCurrency: 'USD',
    });
    const createdBody: { data: GroupBody } = await response.json();
    const created = createdBody.data;

    expect(response.status).toBe(201);
    expect(created).toMatchObject({
      name: 'Viaje Guatemala',
      description: 'Vacaciones 2027',
      defaultCurrency: 'USD',
      status: 'ACTIVE',
      role: 'OWNER',
    });
    expect(await listGroups(cookie)).toEqual([
      expect.objectContaining({ id: created.id, role: 'OWNER' }),
    ]);
  });

  it('shouldNotListGroupsOfOtherUsers', async () => {
    const ana = await sessionCookieFor('ana.ajenos@example.com', 'Ana');
    const klara = await sessionCookieFor('klara.ajenos@example.com', 'Klara');
    await createGroup(klara, { name: 'Solo de Klara', defaultCurrency: 'COP' });

    expect(await listGroups(ana)).toEqual([]);
  });

  it('shouldReturn400WithFieldDetailsForInvalidGroup', async () => {
    const cookie = await sessionCookieFor('ana.invalido@example.com', 'Ana');

    const response = await createGroup(cookie, { name: '', defaultCurrency: 'ARS' });
    const body: {
      error: { code: string; details: { field: string; reason: string }[] };
    } = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual([
      { field: 'name', reason: 'length_1_to_120' },
      { field: 'defaultCurrency', reason: 'unsupported_currency' },
    ]);
  });
});
