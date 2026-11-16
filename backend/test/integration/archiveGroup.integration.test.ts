import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import {
  API,
  Person,
  createGroupAs,
  deleteMember,
  errorCode,
  inviteByEmail,
  joinAsMember,
  membershipInD1,
  patchRole,
  postInviteLink,
  signIn,
} from './groupScenario';

function archive(actor: Person, groupId: string): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/archive`, {
    method: 'POST',
    headers: { cookie: actor.cookie },
  });
}

async function groupInD1(
  groupId: string,
): Promise<{ name: string; status: string; version: number } | null> {
  return env.DB.prepare('SELECT name, status, version FROM groups WHERE id = ?')
    .bind(groupId)
    .first();
}

async function myGroups(person: Person): Promise<{ id: string; status: string }[]> {
  const body: { data: { id: string; status: string }[] } = await (
    await SELF.fetch(`${API}/groups`, { headers: { cookie: person.cookie } })
  ).json();
  return body.data.map(({ id, status }) => ({ id, status }));
}

describe('Archivar el grupo (Worker + D1 + Better Auth)', () => {
  it('shouldArchiveTheGroupForEveryMemberAndKeepItReadable', async () => {
    const ana = await signIn('ana.archiva@example.com', 'Ana');
    const juan = await signIn('juan.archiva@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const archived = await archive(ana, casa);

    expect(archived.status).toBe(200);
    const body: { data: { id: string; status: string; role: string } } = await archived.json();
    expect(body.data).toMatchObject({ id: casa, status: 'ARCHIVED', role: 'OWNER' });
    expect(await groupInD1(casa)).toMatchObject({ status: 'ARCHIVED', version: 2 });
    expect(await myGroups(juan)).toEqual([{ id: casa, status: 'ARCHIVED' }]);
    const detail = await SELF.fetch(`${API}/groups/${casa}`, { headers: { cookie: juan.cookie } });
    const members = await SELF.fetch(`${API}/groups/${casa}/members`, {
      headers: { cookie: juan.cookie },
    });
    expect([detail.status, members.status]).toEqual([200, 200]);
    // Archivar de nuevo responde igual, sin cambios.
    const again = await archive(ana, casa);
    expect(again.status).toBe(200);
    expect(await groupInD1(casa)).toMatchObject({ status: 'ARCHIVED', version: 2 });
  });

  it('shouldDenyArchivingToAnAdministratorAndHideTheGroupFromNonMembers', async () => {
    const ana = await signIn('ana.archiva.admin@example.com', 'Ana');
    const juan = await signIn('juan.archiva.admin@example.com', 'Juan');
    const eva = await signIn('eva.archiva.admin@example.com', 'Eva');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    await patchRole(ana, casa, juan.userId, 'ADMINISTRATOR');

    const byAdministrator = await archive(juan, casa);
    const byStranger = await archive(eva, casa);

    expect([byAdministrator.status, await errorCode(byAdministrator)]).toEqual([
      403,
      'PERMISSION_DENIED',
    ]);
    expect([byStranger.status, await errorCode(byStranger)]).toEqual([404, 'GROUP_NOT_FOUND']);
    expect((await groupInD1(casa))?.status).toBe('ACTIVE');
  });

  it('shouldRejectEveryChangeWithGroupArchivedAndChangeNothing', async () => {
    const ana = await signIn('ana.archiva.lectura@example.com', 'Ana');
    const juan = await signIn('juan.archiva.lectura@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    await archive(ana, casa);
    const json = { cookie: ana.cookie, 'content-type': 'application/json' };

    const responses = [
      await SELF.fetch(`${API}/groups/${casa}`, {
        method: 'PATCH',
        headers: json,
        body: JSON.stringify({ name: 'Casa nueva', description: null }),
      }),
      await SELF.fetch(`${API}/groups/${casa}/members/invitations`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ email: 'luis.archiva@example.com', role: 'MEMBER' }),
      }),
      await postInviteLink(ana, casa),
      await patchRole(ana, casa, juan.userId, 'ADMINISTRATOR'),
      await deleteMember(ana, casa, juan.userId),
      await SELF.fetch(`${API}/groups/${casa}/leave`, {
        method: 'POST',
        headers: { cookie: juan.cookie },
      }),
    ];

    for (const response of responses) {
      expect([response.status, await errorCode(response)]).toEqual([409, 'GROUP_ARCHIVED']);
    }
    expect(await groupInD1(casa)).toEqual({ name: 'Casa', status: 'ARCHIVED', version: 2 });
    expect(await membershipInD1(casa, juan.userId)).toMatchObject({
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    const counts = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM invitations WHERE group_id = ?1) AS invitations,
              (SELECT COUNT(*) FROM invite_links WHERE group_id = ?1) AS links`,
    )
      .bind(casa)
      .first<{ invitations: number; links: number }>();
    // El único enlace es el que usó Juan para entrar, antes de archivar.
    expect(counts).toEqual({ invitations: 0, links: 1 });
  });

  it('shouldHidePendingInvitationsAndDisableLinksOfAnArchivedGroup', async () => {
    const ana = await signIn('ana.archiva.invita@example.com', 'Ana');
    const eva = await signIn('eva.archiva.invita@example.com', 'Eva');
    const casa = await createGroupAs(ana, 'Casa');
    const invitationId = await inviteByEmail(ana, casa, 'eva.archiva.invita@example.com', 'MEMBER');
    const link: { data: { code: string } } = await (await postInviteLink(ana, casa)).json();
    await archive(ana, casa);

    const invitations: { data: unknown[] } = await (
      await SELF.fetch(`${API}/invitations`, { headers: { cookie: eva.cookie } })
    ).json();
    const accepted = await SELF.fetch(`${API}/invitations/${invitationId}/accept`, {
      method: 'POST',
      headers: { cookie: eva.cookie },
    });
    const opened = await SELF.fetch(`${API}/invite-links/${link.data.code}`, {
      headers: { cookie: eva.cookie },
    });
    const joined = await SELF.fetch(`${API}/invite-links/${link.data.code}/join`, {
      method: 'POST',
      headers: { cookie: eva.cookie },
    });

    expect(invitations.data).toEqual([]);
    expect([accepted.status, await errorCode(accepted)]).toEqual([409, 'GROUP_ARCHIVED']);
    expect([opened.status, await errorCode(opened)]).toEqual([404, 'INVITE_LINK_NOT_FOUND']);
    expect([joined.status, await errorCode(joined)]).toEqual([404, 'INVITE_LINK_NOT_FOUND']);
    expect(await membershipInD1(casa, eva.userId)).toBeNull();
    const invitation = await env.DB.prepare('SELECT status FROM invitations WHERE id = ?')
      .bind(invitationId)
      .first<{ status: string }>();
    expect(invitation?.status).toBe('PENDING');
  });
});
