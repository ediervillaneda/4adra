import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { sessionCookieFor } from './sessionCookieFor';

const API = 'http://localhost:8787/api/v1';

interface InviteLinkBody {
  groupId: string;
  code: string;
  expiresAt: string;
}

interface ErrorBody {
  error: { code: string };
}

/** Sesión y perfil (vía GET /me, como hace la PWA al entrar). */
async function signIn(email: string, name: string): Promise<{ userId: string; cookie: string }> {
  const cookie = await sessionCookieFor(email, name);
  const me: { data: { id: string } } = await (
    await SELF.fetch(`${API}/me`, { headers: { cookie } })
  ).json();
  return { userId: me.data.id, cookie };
}

async function createGroupAs(cookie: string, name: string): Promise<string> {
  const body: { data: { id: string } } = await (
    await SELF.fetch(`${API}/groups`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name, defaultCurrency: 'COP' }),
    })
  ).json();
  return body.data.id;
}

function postInviteLink(cookie: string, groupId: string): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/members/invite-link`, {
    method: 'POST',
    headers: { cookie },
  });
}

async function createLinkAs(cookie: string, groupId: string): Promise<InviteLinkBody> {
  const response = await postInviteLink(cookie, groupId);
  expect(response.status).toBe(201);
  const body: { data: InviteLinkBody } = await response.json();
  return body.data;
}

function getLink(cookie: string, code: string): Promise<Response> {
  return SELF.fetch(`${API}/invite-links/${code}`, { headers: { cookie } });
}

function join(cookie: string, code: string): Promise<Response> {
  return SELF.fetch(`${API}/invite-links/${code}/join`, { method: 'POST', headers: { cookie } });
}

async function errorCode(response: Response): Promise<string> {
  const body: ErrorBody = await response.json();
  return body.error.code;
}

async function myGroupIds(cookie: string): Promise<string[]> {
  const body: { data: { id: string }[] } = await (
    await SELF.fetch(`${API}/groups`, { headers: { cookie } })
  ).json();
  return body.data.map((group) => group.id);
}

async function membershipRoles(groupId: string, userId: string): Promise<string[]> {
  const result = await env.DB.prepare(
    'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
  )
    .bind(groupId, userId)
    .all<{ role: string }>();
  return result.results.map((row) => row.role);
}

async function expireLinksOf(groupId: string): Promise<void> {
  await env.DB.prepare('UPDATE invite_links SET expires_at = ? WHERE group_id = ?')
    .bind('2020-01-01T00:00:00.000Z', groupId)
    .run();
}

describe('Enlace de invitación (Worker + D1 + Better Auth)', () => {
  it('shouldCreateLinkAndShowGroupNameStoringOnlyTheHash', async () => {
    const { cookie: ana } = await signIn('ana.crea-enlace@example.com', 'Ana');
    const { cookie: juan } = await signIn('juan.crea-enlace@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');

    const link = await createLinkAs(ana, casa);
    const preview = await getLink(juan, link.code);

    expect(link.groupId).toBe(casa);
    expect(preview.status).toBe(200);
    const body: { data: unknown } = await preview.json();
    expect(body.data).toEqual({ groupId: casa, groupName: 'Casa', expiresAt: link.expiresAt });
    const rows = await env.DB.prepare('SELECT * FROM invite_links WHERE group_id = ?')
      .bind(casa)
      .all<{ code_hash: string }>();
    expect(rows.results).toHaveLength(1);
    expect(rows.results[0]?.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows.results)).not.toContain(link.code);
  });

  it('shouldStopServingPreviousLinkWhenNewOneIsCreated', async () => {
    const { cookie: ana } = await signIn('ana.reemplaza@example.com', 'Ana');
    const casa = await createGroupAs(ana, 'Casa');
    const first = await createLinkAs(ana, casa);

    const second = await createLinkAs(ana, casa);

    const old = await getLink(ana, first.code);
    expect(old.status).toBe(404);
    expect(await errorCode(old)).toBe('INVITE_LINK_NOT_FOUND');
    expect((await getLink(ana, second.code)).status).toBe(200);
  });

  it('shouldJoinAsMemberOnceAndListGroupInHome', async () => {
    const { cookie: ana } = await signIn('ana.une@example.com', 'Ana');
    const { userId: juanId, cookie: juan } = await signIn('juan.une@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    const { code } = await createLinkAs(ana, casa);

    const response = await join(juan, code);
    const again = await join(juan, code);

    expect(response.status).toBe(200);
    const body: { data: unknown } = await response.json();
    expect(body.data).toMatchObject({
      groupId: casa,
      userId: juanId,
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    expect(again.status).toBe(200);
    expect(await myGroupIds(juan)).toEqual([casa]);
    expect(await membershipRoles(casa, juanId)).toEqual(['MEMBER']);
  });

  it('shouldRejectMemberUnknownCodeAndExpiredLink', async () => {
    const { cookie: ana } = await signIn('ana.rechaza-enlace@example.com', 'Ana');
    const { cookie: juan } = await signIn('juan.rechaza-enlace@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    const { code } = await createLinkAs(ana, casa);
    await join(juan, code);

    const asMember = await postInviteLink(juan, casa);
    expect(asMember.status).toBe(403);
    expect(await errorCode(asMember)).toBe('PERMISSION_DENIED');

    for (const response of [await getLink(juan, 'no-existe'), await join(juan, 'no-existe')]) {
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe('INVITE_LINK_NOT_FOUND');
    }

    await expireLinksOf(casa);
    for (const response of [await getLink(juan, code), await join(juan, code)]) {
      expect(response.status).toBe(409);
      expect(await errorCode(response)).toBe('INVITE_LINK_EXPIRED');
    }
  });
});
