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
  myGroupIds,
  patchRole,
  signIn,
} from './groupScenario';

const LONG_AGO = '2020-01-01T00:00:00.000Z';

/** Remueve a la persona y deja su fecha de ingreso en el pasado, para ver que el reingreso la renueva. */
async function removeLongAgo(owner: Person, person: Person, groupId: string): Promise<void> {
  expect((await deleteMember(owner, groupId, person.userId)).status).toBe(200);
  await env.DB.prepare('UPDATE group_members SET joined_at = ? WHERE group_id = ? AND user_id = ?')
    .bind(LONG_AGO, groupId, person.userId)
    .run();
}

async function statusInD1(groupId: string, userId: string): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT status FROM group_members WHERE group_id = ? AND user_id = ?',
  )
    .bind(groupId, userId)
    .first<{ status: string }>();
  return row?.status ?? null;
}

describe('Remover a un miembro (Worker + D1 + Better Auth)', () => {
  it('shouldRemoveMemberAndHideTheGroupFromThem', async () => {
    const ana = await signIn('ana.remueve@example.com', 'Ana');
    const juan = await signIn('juan.remueve@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const removed = await deleteMember(ana, casa, juan.userId);

    expect(removed.status).toBe(200);
    const body: { data: { userId: string; role: string; status: string } } = await removed.json();
    expect(body.data).toMatchObject({ userId: juan.userId, role: 'MEMBER', status: 'REMOVED' });
    expect(await statusInD1(casa, juan.userId)).toBe('REMOVED');
    const detail = await SELF.fetch(`${API}/groups/${casa}`, { headers: { cookie: juan.cookie } });
    expect(detail.status).toBe(404);
    expect(await errorCode(detail)).toBe('GROUP_NOT_FOUND');
    expect(await myGroupIds(juan)).not.toContain(casa);
  });

  it('shouldLetAdministratorRemoveOnlyMembersAndRejectSelfAndRepeatedRemoval', async () => {
    const ana = await signIn('ana.admin-remueve@example.com', 'Ana');
    const juan = await signIn('juan.admin-remueve@example.com', 'Juan');
    const eva = await signIn('eva.admin-remueve@example.com', 'Eva');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    await joinAsMember(ana, eva, casa);
    expect((await patchRole(ana, casa, juan.userId, 'ADMINISTRATOR')).status).toBe(200);

    const ownerAttempt = await deleteMember(juan, casa, ana.userId);
    expect(ownerAttempt.status).toBe(403);
    expect(await errorCode(ownerAttempt)).toBe('PERMISSION_DENIED');
    expect(await statusInD1(casa, ana.userId)).toBe('ACTIVE');

    const self = await deleteMember(juan, casa, juan.userId);
    expect(self.status).toBe(409);
    expect(await errorCode(self)).toBe('CANNOT_REMOVE_SELF');

    expect((await deleteMember(juan, casa, eva.userId)).status).toBe(200);
    const again = await deleteMember(juan, casa, eva.userId);
    expect(again.status).toBe(404);
    expect(await errorCode(again)).toBe('MEMBER_NOT_FOUND');
  });

  it('shouldReactivateRemovedMemberWhenTheyAcceptANewInvitation', async () => {
    const ana = await signIn('ana.reinvita@example.com', 'Ana');
    const juan = await signIn('juan.reinvita@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    await removeLongAgo(ana, juan, casa);

    const invitationId = await inviteByEmail(
      ana,
      casa,
      'juan.reinvita@example.com',
      'ADMINISTRATOR',
    );
    const accepted = await SELF.fetch(`${API}/invitations/${invitationId}/accept`, {
      method: 'POST',
      headers: { cookie: juan.cookie },
    });

    expect(accepted.status).toBe(200);
    const membership = await membershipInD1(casa, juan.userId);
    expect(membership).toMatchObject({ role: 'ADMINISTRATOR', status: 'ACTIVE' });
    expect(membership?.joined_at).not.toBe(LONG_AGO);
    expect(await myGroupIds(juan)).toContain(casa);
  });

  it('shouldReactivateRemovedMemberAsMemberWhenTheyJoinWithALink', async () => {
    const ana = await signIn('ana.reenlace@example.com', 'Ana');
    const juan = await signIn('juan.reenlace@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    expect((await patchRole(ana, casa, juan.userId, 'READ_ONLY')).status).toBe(200);
    await removeLongAgo(ana, juan, casa);

    await joinAsMember(ana, juan, casa);

    const membership = await membershipInD1(casa, juan.userId);
    expect(membership).toMatchObject({ role: 'MEMBER', status: 'ACTIVE' });
    expect(membership?.joined_at).not.toBe(LONG_AGO);
    expect(await myGroupIds(juan)).toContain(casa);
  });
});
