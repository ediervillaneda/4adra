import { describe, it, expect } from 'vitest';
import { GroupId } from '../../../../src/domain/group/GroupId';
import {
  InviteLinkExpiredException,
  InviteLinkNotFoundException,
} from '../../../../src/domain/invitation/errors';
import { User } from '../../../../src/domain/user/User';
import { UserDisabledException } from '../../../../src/domain/user/errors';
import { NOW, juan } from '../../../support/invitationScenario';
import { ana, eva, inviteLinkScenario } from '../../../support/inviteLinkScenario';

const casa = GroupId.fromString('grp_casa');

describe('JoinGroupWithInviteLinkUseCase', () => {
  it('shouldJoinAsMemberAndCreateProfileIfMissing', async () => {
    const { createLink, joinWithLink, groups, users } = inviteLinkScenario();
    const { code } = await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    const view = await joinWithLink.execute({ actor: eva, code });

    expect(view).toEqual({
      groupId: 'grp_casa',
      userId: 'usr_eva',
      role: 'MEMBER',
      status: 'ACTIVE',
      joinedAt: '2026-11-13T12:00:00.000Z',
    });
    expect((await users.findById(eva.userId))?.displayName).toBe('Eva');
    expect((await groups.findForMember(casa, eva.userId))?.role).toBe('MEMBER');
  });

  it('shouldKeepRoleAndNotDuplicateWhenAlreadyActiveMember', async () => {
    const { createLink, joinWithLink, groups, joinAs } = inviteLinkScenario();
    joinAs('grp_casa', 'ADMINISTRATOR');
    const { code } = await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    const view = await joinWithLink.execute({ actor: juan, code });

    expect(view.role).toBe('ADMINISTRATOR');
    const juanMemberships = (await groups.listActiveMembers(casa)).filter(
      (member) => member.userId.toString() === 'usr_juan',
    );
    expect(juanMemberships.map((member) => member.role)).toEqual(['ADMINISTRATOR']);
  });

  it('shouldThrowNotFoundOrExpiredAndChangeNothing (not found)', async () => {
    const { createLink, joinWithLink, groups, users } = inviteLinkScenario();
    await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    await expect(joinWithLink.execute({ actor: eva, code: 'no-existe' })).rejects.toBeInstanceOf(
      InviteLinkNotFoundException,
    );
    expect(await groups.findForMember(casa, eva.userId)).toBeNull();
    expect(await users.findById(eva.userId)).toBeNull();
  });

  it('shouldThrowNotFoundOrExpiredAndChangeNothing (expired)', async () => {
    const { createLink, joinWithLink, groups, users, setNow } = inviteLinkScenario();
    const { code } = await createLink.execute({ actor: ana, groupId: 'grp_casa' });
    setNow(new Date('2026-11-20T12:00:00.000Z'));

    await expect(joinWithLink.execute({ actor: eva, code })).rejects.toBeInstanceOf(
      InviteLinkExpiredException,
    );
    expect(await groups.findForMember(casa, eva.userId)).toBeNull();
    expect(await users.findById(eva.userId)).toBeNull();
  });

  it('shouldThrowUserDisabledForDisabledAccount', async () => {
    const { createLink, joinWithLink, groups, users } = inviteLinkScenario();
    users.seed(
      User.create({
        id: juan.userId,
        displayName: 'Juan',
        email: juan.email,
        photoUrl: null,
        preferredCurrency: 'COP',
        language: 'es',
        timeZone: 'America/Bogota',
        status: 'DISABLED',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    const { code } = await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    await expect(joinWithLink.execute({ actor: juan, code })).rejects.toBeInstanceOf(
      UserDisabledException,
    );
    expect(await groups.findForMember(casa, juan.userId)).toBeNull();
  });
});
