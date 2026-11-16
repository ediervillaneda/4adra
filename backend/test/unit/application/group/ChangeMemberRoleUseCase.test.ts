import { describe, it, expect, vi } from 'vitest';
import { ChangeMemberRoleUseCase } from '../../../../src/application/group/ChangeMemberRoleUseCase';
import {
  GroupNotFoundException,
  LastOwnerException,
  MemberNotFoundException,
  PermissionDeniedException,
} from '../../../../src/domain/group/errors';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { MemberRole } from '../../../../src/domain/group/MemberRole';
import {
  InvitationScenario,
  NOW,
  invitationScenario,
  juan,
} from '../../../support/invitationScenario';
import { ana } from '../../../support/inviteLinkScenario';

interface ChangeRoleScenario extends InvitationScenario {
  changeRole: ChangeMemberRoleUseCase;
}

async function roleOf(
  scenario: ChangeRoleScenario,
  userId: string,
): Promise<MemberRole | undefined> {
  const members = await scenario.groups.listActiveMembers(GroupId.fromString('grp_casa'));
  return members.find((member) => member.userId.toString() === userId)?.role;
}

function changeRoleScenario(): ChangeRoleScenario {
  const base = invitationScenario();
  return { ...base, changeRole: new ChangeMemberRoleUseCase(base.groups, () => NOW) };
}

describe('ChangeMemberRoleUseCase', () => {
  it('shouldChangeRoleWhenActorIsOwner', async () => {
    const { changeRole, joinAs, groups } = changeRoleScenario();
    joinAs('grp_casa', 'MEMBER');

    const view = await changeRole.execute({
      actor: ana,
      groupId: 'grp_casa',
      userId: 'usr_juan',
      input: { role: 'ADMINISTRATOR' },
    });

    expect(view).toEqual({
      userId: 'usr_juan',
      displayName: 'Juan',
      photoUrl: null,
      role: 'ADMINISTRATOR',
      status: 'ACTIVE',
      joinedAt: '2026-11-12T15:00:00.000Z',
    });
    const members = await groups.listActiveMembers(GroupId.fromString('grp_casa'));
    expect(members.find((member) => member.userId.toString() === 'usr_juan')?.role).toBe(
      'ADMINISTRATOR',
    );
  });

  it.each(['ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const)(
    'shouldThrowPermissionDeniedWhenActorIsNotOwner (%s)',
    async (role) => {
      const scenario = changeRoleScenario();
      scenario.joinAs('grp_casa', role);

      await expect(
        scenario.changeRole.execute({
          actor: juan,
          groupId: 'grp_casa',
          userId: 'usr_ana',
          input: { role: 'MEMBER' },
        }),
      ).rejects.toBeInstanceOf(PermissionDeniedException);
      expect(await roleOf(scenario, 'usr_ana')).toBe('OWNER');
    },
  );

  it('shouldThrowGroupNotFoundWhenActorIsNotActiveMember', async () => {
    const scenario = changeRoleScenario();

    await expect(
      scenario.changeRole.execute({
        actor: juan,
        groupId: 'grp_casa',
        userId: 'usr_ana',
        input: { role: 'MEMBER' },
      }),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
    expect(await roleOf(scenario, 'usr_ana')).toBe('OWNER');
  });

  it.each(['usr_juan', 'usr_inexistente', '   '])(
    'shouldThrowMemberNotFoundWhenTargetIsNotActiveMember (%j)',
    async (userId) => {
      const scenario = changeRoleScenario();
      scenario.groups.seedMembership(scenario.groups.groupById(GroupId.fromString('grp_casa'))!, {
        groupId: 'grp_casa',
        userId: 'usr_juan',
        role: 'MEMBER',
        status: 'REMOVED',
      });

      await expect(
        scenario.changeRole.execute({
          actor: ana,
          groupId: 'grp_casa',
          userId,
          input: { role: 'ADMINISTRATOR' },
        }),
      ).rejects.toBeInstanceOf(MemberNotFoundException);
    },
  );

  it('shouldThrowLastOwnerWhenOnlyOwnerDemotesThemself', async () => {
    const scenario = changeRoleScenario();
    scenario.joinAs('grp_casa', 'ADMINISTRATOR');

    await expect(
      scenario.changeRole.execute({
        actor: ana,
        groupId: 'grp_casa',
        userId: 'usr_ana',
        input: { role: 'ADMINISTRATOR' },
      }),
    ).rejects.toBeInstanceOf(LastOwnerException);
    expect(await roleOf(scenario, 'usr_ana')).toBe('OWNER');
  });

  it('shouldThrowPermissionDeniedWhenActorStopsBeingOwnerBeforeTheWrite', async () => {
    const scenario = changeRoleScenario();
    scenario.joinAs('grp_casa', 'MEMBER');
    vi.spyOn(scenario.groups, 'changeMemberRole').mockResolvedValue({
      status: 'PERMISSION_DENIED',
    });

    await expect(
      scenario.changeRole.execute({
        actor: ana,
        groupId: 'grp_casa',
        userId: 'usr_juan',
        input: { role: 'OWNER' },
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedException);
  });

  it('shouldRecordWhenTheRoleChanged', async () => {
    const scenario = changeRoleScenario();
    scenario.joinAs('grp_casa', 'MEMBER');

    await scenario.changeRole.execute({
      actor: ana,
      groupId: 'grp_casa',
      userId: 'usr_juan',
      input: { role: 'READ_ONLY' },
    });

    expect(
      scenario.groups.membershipOf(GroupId.fromString('grp_casa'), juan.userId)?.updatedAt,
    ).toEqual(NOW);
  });
});
