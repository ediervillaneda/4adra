import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { sessionCookieFor } from './sessionCookieFor';

const API = 'http://localhost:8787/api/v1';

interface ReceivedInvitationBody {
  invitationId: string;
  groupId: string;
  groupName: string;
  invitedByName: string;
  role: string;
  expiresAt: string;
}

interface InvitationBody {
  invitationId: string;
  status: string;
  role: string;
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

async function invite(
  cookie: string,
  groupId: string,
  email: string,
  role: string,
): Promise<string> {
  await env.DB.prepare('INSERT OR IGNORE INTO allowed_emails (email, created_at) VALUES (?, ?)')
    .bind(email, '2026-11-12T00:00:00.000Z')
    .run();
  const response = await SELF.fetch(`${API}/groups/${groupId}/members/invitations`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  expect(response.status).toBe(201);
  const body: { data: InvitationBody } = await response.json();
  return body.data.invitationId;
}

async function myInvitations(cookie: string): Promise<ReceivedInvitationBody[]> {
  const response = await SELF.fetch(`${API}/invitations`, { headers: { cookie } });
  expect(response.status).toBe(200);
  const body: { data: ReceivedInvitationBody[] } = await response.json();
  return body.data;
}

async function respond(
  cookie: string,
  invitationId: string,
  answer: 'accept' | 'decline',
): Promise<Response> {
  return SELF.fetch(`${API}/invitations/${invitationId}/${answer}`, {
    method: 'POST',
    headers: { cookie },
  });
}

async function myGroupIds(cookie: string): Promise<string[]> {
  const body: { data: { id: string }[] } = await (
    await SELF.fetch(`${API}/groups`, { headers: { cookie } })
  ).json();
  return body.data.map((group) => group.id);
}

async function membershipRows(
  groupId: string,
  userId: string,
): Promise<{ role: string; status: string }[]> {
  const result = await env.DB.prepare(
    'SELECT role, status FROM group_members WHERE group_id = ? AND user_id = ?',
  )
    .bind(groupId, userId)
    .all<{ role: string; status: string }>();
  return result.results;
}

describe('Invitaciones recibidas (Worker + D1 + Better Auth)', () => {
  it('shouldListOnlyMyPendingUnexpiredInvitations', async () => {
    const { cookie: ana } = await signIn('ana.lista-inv@example.com', 'Ana');
    const { cookie: juan } = await signIn('juan.lista-inv@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    const playa = await createGroupAs(ana, 'Playa');
    const vigente = await invite(ana, casa, 'juan.lista-inv@example.com', 'ADMINISTRATOR');
    const vencida = await invite(ana, playa, 'juan.lista-inv@example.com', 'MEMBER');
    await env.DB.prepare('UPDATE invitations SET expires_at = ? WHERE id = ?')
      .bind('2020-01-01T00:00:00.000Z', vencida)
      .run();
    await invite(ana, casa, 'eva.lista-inv@example.com', 'MEMBER');

    const invitations = await myInvitations(juan);

    expect(invitations).toEqual([
      {
        invitationId: vigente,
        groupId: casa,
        groupName: 'Casa',
        invitedByName: 'Ana',
        role: 'ADMINISTRATOR',
        expiresAt: expect.any(String) as string,
      },
    ]);
  });

  it('shouldJoinGroupOnAcceptAndStopListingInvitation', async () => {
    const { cookie: ana } = await signIn('ana.acepta@example.com', 'Ana');
    const { cookie: juan } = await signIn('juan.acepta@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    const invitationId = await invite(ana, casa, 'juan.acepta@example.com', 'MEMBER');

    const response = await respond(juan, invitationId, 'accept');
    const body: { data: InvitationBody } = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ invitationId, status: 'ACCEPTED', role: 'MEMBER' });
    expect(await myGroupIds(juan)).toEqual([casa]);
    expect(await myInvitations(juan)).toEqual([]);
  });

  it('shouldReturn409AlreadyRespondedOnSecondAcceptKeepingOneMembership', async () => {
    const { cookie: ana } = await signIn('ana.doble@example.com', 'Ana');
    const { cookie: juan, userId } = await signIn('juan.doble@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    const invitationId = await invite(ana, casa, 'juan.doble@example.com', 'MEMBER');
    await respond(juan, invitationId, 'accept');

    const again = await respond(juan, invitationId, 'accept');
    const body: ErrorBody = await again.json();

    expect(again.status).toBe(409);
    expect(body.error.code).toBe('INVITATION_ALREADY_RESPONDED');
    expect(await membershipRows(casa, userId)).toEqual([{ role: 'MEMBER', status: 'ACTIVE' }]);
  });

  it('shouldCloseInvitationKeepingRoleWhenAlreadyActiveMember', async () => {
    const { cookie: ana } = await signIn('ana.ya-dentro@example.com', 'Ana');
    const { cookie: juan, userId } = await signIn('juan.ya-dentro@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    const invitationId = await invite(ana, casa, 'juan.ya-dentro@example.com', 'ADMINISTRATOR');
    const joinedAt = '2026-11-12T15:00:00.000Z';
    await env.DB.prepare(
      `INSERT INTO group_members (group_id, user_id, role, status, joined_at, updated_at)
       VALUES (?, ?, 'READ_ONLY', 'ACTIVE', ?, ?)`,
    )
      .bind(casa, userId, joinedAt, joinedAt)
      .run();

    const response = await respond(juan, invitationId, 'accept');

    expect(response.status).toBe(200);
    expect(await membershipRows(casa, userId)).toEqual([{ role: 'READ_ONLY', status: 'ACTIVE' }]);
    expect(await myInvitations(juan)).toEqual([]);
  });

  it('shouldNotJoinGroupOnDecline', async () => {
    const { cookie: ana } = await signIn('ana.rechaza@example.com', 'Ana');
    const { cookie: juan } = await signIn('juan.rechaza@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    const invitationId = await invite(ana, casa, 'juan.rechaza@example.com', 'MEMBER');

    const response = await respond(juan, invitationId, 'decline');
    const body: { data: InvitationBody } = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ invitationId, status: 'DECLINED' });
    expect(await myGroupIds(juan)).toEqual([]);
    expect((await SELF.fetch(`${API}/groups/${casa}`, { headers: { cookie: juan } })).status).toBe(
      404,
    );
    expect(await myInvitations(juan)).toEqual([]);
  });

  it('shouldReturn404InvitationNotFoundForAnotherEmailsInvitation', async () => {
    const { cookie: ana } = await signIn('ana.ajena-inv@example.com', 'Ana');
    const { cookie: intruso } = await signIn('ivan.ajena-inv@example.com', 'Iván');
    const casa = await createGroupAs(ana, 'Casa');
    const invitationId = await invite(ana, casa, 'juan.ajena-inv@example.com', 'MEMBER');

    for (const answer of ['accept', 'decline'] as const) {
      const response = await respond(intruso, invitationId, answer);
      const body: ErrorBody = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('INVITATION_NOT_FOUND');
    }
    const row = await env.DB.prepare('SELECT status FROM invitations WHERE id = ?')
      .bind(invitationId)
      .first<{ status: string }>();
    expect(row?.status).toBe('PENDING');
  });

  it('shouldReturn401WithoutSession', async () => {
    const responses = [
      await SELF.fetch(`${API}/invitations`),
      await SELF.fetch(`${API}/invitations/inv_x/accept`, { method: 'POST' }),
      await SELF.fetch(`${API}/invitations/inv_x/decline`, { method: 'POST' }),
    ];

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401]);
  });
});
