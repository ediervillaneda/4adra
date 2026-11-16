import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { sessionCookieFor } from './sessionCookieFor';

const API = 'http://localhost:8787/api/v1';

interface Person {
  userId: string;
  cookie: string;
}

/** Sesión y perfil (vía GET /me, como hace la PWA al entrar). */
async function signIn(email: string, name: string): Promise<Person> {
  const cookie = await sessionCookieFor(email, name);
  const me: { data: { id: string } } = await (
    await SELF.fetch(`${API}/me`, { headers: { cookie } })
  ).json();
  return { userId: me.data.id, cookie };
}

async function createGroupAs(owner: Person, name: string): Promise<string> {
  const body: { data: { id: string } } = await (
    await SELF.fetch(`${API}/groups`, {
      method: 'POST',
      headers: { cookie: owner.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name, defaultCurrency: 'COP' }),
    })
  ).json();
  return body.data.id;
}

function postInviteLink(person: Person, groupId: string): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/members/invite-link`, {
    method: 'POST',
    headers: { cookie: person.cookie },
  });
}

/** El Owner crea un enlace y la persona entra con él, como Member. */
async function joinAsMember(owner: Person, person: Person, groupId: string): Promise<void> {
  const link: { data: { code: string } } = await (await postInviteLink(owner, groupId)).json();
  const response = await SELF.fetch(`${API}/invite-links/${link.data.code}/join`, {
    method: 'POST',
    headers: { cookie: person.cookie },
  });
  expect(response.status).toBe(200);
}

function patchRole(
  actor: Person,
  groupId: string,
  userId: string,
  role: string,
): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/members/${userId}`, {
    method: 'PATCH',
    headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

async function errorCode(response: Response): Promise<string> {
  const body: { error: { code: string } } = await response.json();
  return body.error.code;
}

async function roleInD1(groupId: string, userId: string): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
  )
    .bind(groupId, userId)
    .first<{ role: string }>();
  return row?.role ?? null;
}

describe('Cambiar el rol de un miembro (Worker + D1 + Better Auth)', () => {
  it('shouldPromoteMemberToOwnerAndThenLetOwnerDemoteThemself', async () => {
    const ana = await signIn('ana.promueve@example.com', 'Ana');
    const juan = await signIn('juan.promueve@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const promoted = await patchRole(ana, casa, juan.userId, 'OWNER');
    expect(promoted.status).toBe(200);
    const body: { data: { userId: string; displayName: string; role: string; status: string } } =
      await promoted.json();
    expect(body.data).toMatchObject({
      userId: juan.userId,
      displayName: 'Juan',
      role: 'OWNER',
      status: 'ACTIVE',
    });

    const demoted = await patchRole(ana, casa, ana.userId, 'MEMBER');
    expect(demoted.status).toBe(200);
    expect(await roleInD1(casa, ana.userId)).toBe('MEMBER');
    expect(await roleInD1(casa, juan.userId)).toBe('OWNER');
  });

  it('shouldRejectDemotingTheOnlyOwnerWithLastOwner', async () => {
    const ana = await signIn('ana.ultima-owner@example.com', 'Ana');
    const juan = await signIn('juan.ultima-owner@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const response = await patchRole(ana, casa, ana.userId, 'ADMINISTRATOR');

    expect(response.status).toBe(409);
    expect(await errorCode(response)).toBe('LAST_OWNER');
    expect(await roleInD1(casa, ana.userId)).toBe('OWNER');
  });

  it('shouldDemoteAnotherOwnerAndReturnMemberNotFoundForInactiveOrUnknownPeople', async () => {
    const ana = await signIn('ana.degrada@example.com', 'Ana');
    const juan = await signIn('juan.degrada@example.com', 'Juan');
    const eva = await signIn('eva.degrada@example.com', 'Eva');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    await joinAsMember(ana, eva, casa);
    expect((await patchRole(ana, casa, juan.userId, 'OWNER')).status).toBe(200);

    const demoted = await patchRole(ana, casa, juan.userId, 'READ_ONLY');
    expect(demoted.status).toBe(200);
    expect(await roleInD1(casa, juan.userId)).toBe('READ_ONLY');

    await env.DB.prepare(
      "UPDATE group_members SET status = 'REMOVED' WHERE group_id = ? AND user_id = ?",
    )
      .bind(casa, eva.userId)
      .run();
    for (const userId of [eva.userId, 'usr_inexistente']) {
      const response = await patchRole(ana, casa, userId, 'ADMINISTRATOR');
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe('MEMBER_NOT_FOUND');
    }
    expect(await roleInD1(casa, eva.userId)).toBe('MEMBER');
  });

  it('shouldDenyNonOwnersAndApplyTheNewRoleOnTheNextAction', async () => {
    const ana = await signIn('ana.siguiente@example.com', 'Ana');
    const juan = await signIn('juan.siguiente@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    expect((await postInviteLink(juan, casa)).status).toBe(403);

    expect((await patchRole(ana, casa, juan.userId, 'ADMINISTRATOR')).status).toBe(200);

    expect((await postInviteLink(juan, casa)).status).toBe(201);
    const denied = await patchRole(juan, casa, ana.userId, 'MEMBER');
    expect(denied.status).toBe(403);
    expect(await errorCode(denied)).toBe('PERMISSION_DENIED');
    expect(await roleInD1(casa, ana.userId)).toBe('OWNER');
  });
});
