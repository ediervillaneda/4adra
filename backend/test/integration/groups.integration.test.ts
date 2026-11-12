import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
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

interface MemberBody {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: string;
  status: string;
  joinedAt: string;
}

async function listMembers(cookie: string, groupId: string): Promise<MemberBody[]> {
  const response = await SELF.fetch(`${BASE}/${groupId}/members`, { headers: { cookie } });
  expect(response.status).toBe(200);
  const body: { data: MemberBody[] } = await response.json();
  return body.data;
}

/** Crea la cuenta y su perfil (vía GET /me) y la suma al grupo directo en D1: aún no hay invitaciones. */
async function addActiveMember(
  groupId: string,
  email: string,
  name: string,
  role: string,
): Promise<string> {
  const cookie = await sessionCookieFor(email, name);
  const me: { data: { id: string } } = await (
    await SELF.fetch('http://localhost:8787/api/v1/me', { headers: { cookie } })
  ).json();
  const joinedAt = '2026-11-12T15:00:00.000Z';
  await env.DB.prepare(
    `INSERT INTO group_members (group_id, user_id, role, status, joined_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
  )
    .bind(groupId, me.data.id, role, joinedAt, joinedAt)
    .run();
  return me.data.id;
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

  it('shouldReturnGroupDetailForActiveMember', async () => {
    const cookie = await sessionCookieFor('ana.detalle@example.com', 'Ana');
    const createdBody: { data: GroupBody } = await (
      await createGroup(cookie, {
        name: 'Casa compartida',
        description: 'Arriendo y servicios',
        defaultCurrency: 'COP',
      })
    ).json();

    const response = await SELF.fetch(`${BASE}/${createdBody.data.id}`, { headers: { cookie } });
    const body: { data: GroupBody } = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      id: createdBody.data.id,
      name: 'Casa compartida',
      description: 'Arriendo y servicios',
      defaultCurrency: 'COP',
    });
  });

  it('shouldListCreatorAsOnlyMemberWithOwnerRole', async () => {
    const cookie = await sessionCookieFor('ana.unica@example.com', 'Ana Única');
    const createdBody: { data: GroupBody } = await (
      await createGroup(cookie, { name: 'Recién creado', defaultCurrency: 'COP' })
    ).json();

    const members = await listMembers(cookie, createdBody.data.id);

    expect(members).toEqual([
      expect.objectContaining({ displayName: 'Ana Única', role: 'OWNER', status: 'ACTIVE' }),
    ]);
  });

  it('shouldListActiveMembersAlphabeticallyByDisplayName', async () => {
    const zoe = await sessionCookieFor('zoe.orden@example.com', 'Zoe');
    const createdBody: { data: GroupBody } = await (
      await createGroup(zoe, { name: 'Orden alfabético', defaultCurrency: 'COP' })
    ).json();
    const groupId = createdBody.data.id;
    await addActiveMember(groupId, 'ana.orden@example.com', 'Ana', 'ADMINISTRATOR');
    const alvaroId = await addActiveMember(groupId, 'alvaro.orden@example.com', 'Álvaro', 'MEMBER');
    await addActiveMember(groupId, 'beto.orden@example.com', 'beto', 'READ_ONLY');
    await env.DB.prepare('UPDATE users SET photo_url = ? WHERE id = ?')
      .bind('https://example.com/alvaro.png', alvaroId)
      .run();

    const members = await listMembers(zoe, groupId);

    expect(members.map((member) => [member.displayName, member.role, member.photoUrl])).toEqual([
      ['Álvaro', 'MEMBER', 'https://example.com/alvaro.png'],
      ['Ana', 'ADMINISTRATOR', null],
      ['beto', 'READ_ONLY', null],
      ['Zoe', 'OWNER', null],
    ]);
  });

  it('shouldNotExposeMemberEmails', async () => {
    const cookie = await sessionCookieFor('ana.privada@example.com', 'Ana');
    const createdBody: { data: GroupBody } = await (
      await createGroup(cookie, { name: 'Privado', defaultCurrency: 'COP' })
    ).json();
    await addActiveMember(createdBody.data.id, 'klara.privada@example.com', 'Klara', 'MEMBER');

    const response = await SELF.fetch(`${BASE}/${createdBody.data.id}/members`, {
      headers: { cookie },
    });
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain('@example.com');
    expect(text).not.toContain('email');
  });

  it('shouldReturn404GroupNotFoundForNonMember', async () => {
    const klara = await sessionCookieFor('klara.ajena@example.com', 'Klara');
    const ana = await sessionCookieFor('ana.ajena@example.com', 'Ana');
    const createdBody: { data: GroupBody } = await (
      await createGroup(klara, { name: 'De Klara', defaultCurrency: 'COP' })
    ).json();

    for (const path of [createdBody.data.id, `${createdBody.data.id}/members`]) {
      const response = await SELF.fetch(`${BASE}/${path}`, { headers: { cookie: ana } });
      const body: { error: { code: string } } = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('GROUP_NOT_FOUND');
    }
  });

  it('shouldReturn404GroupNotFoundForUnknownGroup', async () => {
    const klara = await sessionCookieFor('klara.ajena2@example.com', 'Klara');
    const ana = await sessionCookieFor('ana.ajena2@example.com', 'Ana');
    const createdBody: { data: GroupBody } = await (
      await createGroup(klara, { name: 'De Klara', defaultCurrency: 'COP' })
    ).json();

    for (const suffix of ['', '/members']) {
      const foreign = await SELF.fetch(`${BASE}/${createdBody.data.id}${suffix}`, {
        headers: { cookie: ana },
      });
      const unknown = await SELF.fetch(`${BASE}/grp_no_existe${suffix}`, {
        headers: { cookie: ana },
      });
      const foreignBody: { error: { code: string; message: string } } = await foreign.json();
      const unknownBody: { error: { code: string; message: string } } = await unknown.json();

      expect(unknown.status).toBe(404);
      expect(unknownBody.error.code).toBe('GROUP_NOT_FOUND');
      expect(unknownBody.error.message).toBe(foreignBody.error.message);
    }
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
