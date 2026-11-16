import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import {
  API,
  Person,
  createGroupAs,
  errorCode,
  inviteByEmail,
  joinAsMember,
  membershipInD1,
  myGroupIds,
  patchRole,
  signIn,
} from './groupScenario';

function leave(person: Person, groupId: string): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/leave`, {
    method: 'POST',
    headers: { cookie: person.cookie },
  });
}

describe('Salir del grupo (Worker + D1 + Better Auth)', () => {
  it('shouldLeaveTheGroupAndStopSeeingIt', async () => {
    const ana = await signIn('ana.sale@example.com', 'Ana');
    const juan = await signIn('juan.sale@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const left = await leave(juan, casa);

    expect(left.status).toBe(200);
    const body: { data: { userId: string; role: string; status: string } } = await left.json();
    expect(body.data).toMatchObject({ userId: juan.userId, role: 'MEMBER', status: 'REMOVED' });
    const detail = await SELF.fetch(`${API}/groups/${casa}`, { headers: { cookie: juan.cookie } });
    expect(detail.status).toBe(404);
    expect(await myGroupIds(juan)).not.toContain(casa);
    const again = await leave(juan, casa);
    expect(again.status).toBe(404);
    expect(await errorCode(again)).toBe('GROUP_NOT_FOUND');
  });

  it('shouldKeepTheOnlyOwnerUntilAnotherOwnerIsNamed', async () => {
    const ana = await signIn('ana.unica-owner-sale@example.com', 'Ana');
    const juan = await signIn('juan.unica-owner-sale@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const blocked = await leave(ana, casa);
    expect(blocked.status).toBe(409);
    expect(await errorCode(blocked)).toBe('LAST_OWNER');
    expect(await membershipInD1(casa, ana.userId)).toMatchObject({
      role: 'OWNER',
      status: 'ACTIVE',
    });

    expect((await patchRole(ana, casa, juan.userId, 'OWNER')).status).toBe(200);
    expect((await leave(ana, casa)).status).toBe(200);
    expect(await membershipInD1(casa, ana.userId)).toMatchObject({ status: 'REMOVED' });
  });

  it('shouldReturnWithANewInvitationAfterLeaving', async () => {
    const ana = await signIn('ana.vuelve-invitacion@example.com', 'Ana');
    const juan = await signIn('juan.vuelve-invitacion@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    expect((await leave(juan, casa)).status).toBe(200);

    const invitationId = await inviteByEmail(
      ana,
      casa,
      'juan.vuelve-invitacion@example.com',
      'READ_ONLY',
    );
    const accepted = await SELF.fetch(`${API}/invitations/${invitationId}/accept`, {
      method: 'POST',
      headers: { cookie: juan.cookie },
    });

    expect(accepted.status).toBe(200);
    expect(await membershipInD1(casa, juan.userId)).toMatchObject({
      role: 'READ_ONLY',
      status: 'ACTIVE',
    });
    expect(await myGroupIds(juan)).toContain(casa);
  });

  it('shouldReturnAsMemberWithALinkAfterLeaving', async () => {
    const ana = await signIn('ana.vuelve-enlace@example.com', 'Ana');
    const juan = await signIn('juan.vuelve-enlace@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);
    expect((await patchRole(ana, casa, juan.userId, 'ADMINISTRATOR')).status).toBe(200);
    expect((await leave(juan, casa)).status).toBe(200);

    await joinAsMember(ana, juan, casa);

    expect(await membershipInD1(casa, juan.userId)).toMatchObject({
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    expect(await myGroupIds(juan)).toContain(casa);
  });
});
