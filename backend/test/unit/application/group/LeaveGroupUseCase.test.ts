import { describe, it, expect, vi } from 'vitest';
import { LeaveGroupUseCase } from '../../../../src/application/group/LeaveGroupUseCase';
import { GroupNotFoundException, LastOwnerException } from '../../../../src/domain/group/errors';
import { GroupId } from '../../../../src/domain/group/GroupId';
import {
  InvitationScenario,
  NOW,
  invitationScenario,
  juan,
} from '../../../support/invitationScenario';
import { ana } from '../../../support/inviteLinkScenario';

interface LeaveScenario extends InvitationScenario {
  leaveGroup: LeaveGroupUseCase;
  activeMemberIds: () => Promise<string[]>;
  roleOf: (userId: string) => Promise<string | undefined>;
}

function leaveScenario(): LeaveScenario {
  const base = invitationScenario();
  const casa = GroupId.fromString('grp_casa');
  return {
    ...base,
    leaveGroup: new LeaveGroupUseCase(base.groups, () => NOW),
    activeMemberIds: async () =>
      (await base.groups.listActiveMembers(casa)).map((member) => member.userId.toString()).sort(),
    roleOf: async (userId) =>
      (await base.groups.listActiveMembers(casa)).find(
        (member) => member.userId.toString() === userId,
      )?.role,
  };
}

describe('LeaveGroupUseCase', () => {
  it.each(['ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const)(
    'shouldLeaveTheGroupAndStopSeeingIt (%s)',
    async (role) => {
      const scenario = leaveScenario();
      scenario.joinAs('grp_casa', role);

      const view = await scenario.leaveGroup.execute({ actor: juan, groupId: 'grp_casa' });

      expect(view).toEqual({
        userId: 'usr_juan',
        displayName: 'Juan',
        photoUrl: null,
        role,
        status: 'REMOVED',
        joinedAt: '2026-11-12T15:00:00.000Z',
      });
      expect(await scenario.activeMemberIds()).toEqual(['usr_ana']);
      const juanGroups = await scenario.groups.listForMember(juan.userId);
      expect(juanGroups.map((entry) => entry.group.id.toString())).toEqual([]);
    },
  );

  it('shouldLetAnOwnerLeaveWhenAnotherOwnerRemains', async () => {
    const scenario = leaveScenario();
    scenario.joinAs('grp_casa', 'OWNER');

    const view = await scenario.leaveGroup.execute({ actor: ana, groupId: 'grp_casa' });

    expect(view.status).toBe('REMOVED');
    expect(await scenario.activeMemberIds()).toEqual(['usr_juan']);
    expect(await scenario.roleOf('usr_juan')).toBe('OWNER');
  });

  it.each([
    ['con más miembros', true],
    ['siendo la única persona del grupo', false],
  ])('shouldThrowLastOwnerWhenTheOnlyOwnerLeaves (%s)', async (_case, withMember) => {
    const scenario = leaveScenario();
    if (withMember) {
      scenario.joinAs('grp_casa', 'ADMINISTRATOR');
    }

    await expect(
      scenario.leaveGroup.execute({ actor: ana, groupId: 'grp_casa' }),
    ).rejects.toBeInstanceOf(LastOwnerException);
    expect(await scenario.roleOf('usr_ana')).toBe('OWNER');
  });

  it('shouldThrowGroupNotFoundWhenActorIsNotActiveMember', async () => {
    const scenario = leaveScenario();

    await expect(
      scenario.leaveGroup.execute({ actor: juan, groupId: 'grp_casa' }),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
    expect(await scenario.activeMemberIds()).toEqual(['usr_ana']);
  });

  it('shouldThrowGroupNotFoundWhenActorStopsBeingMemberBeforeTheWrite', async () => {
    const scenario = leaveScenario();
    scenario.joinAs('grp_casa', 'MEMBER');
    vi.spyOn(scenario.groups, 'leaveGroup').mockResolvedValue({ status: 'NOT_MEMBER' });

    await expect(
      scenario.leaveGroup.execute({ actor: juan, groupId: 'grp_casa' }),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
  });
});
