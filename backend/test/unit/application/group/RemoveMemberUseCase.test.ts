import { describe, it, expect, vi } from 'vitest';
import { RemoveMemberUseCase } from '../../../../src/application/group/RemoveMemberUseCase';
import {
  CannotRemoveSelfException,
  GroupNotFoundException,
  MemberNotFoundException,
  PermissionDeniedException,
} from '../../../../src/domain/group/errors';
import { GroupId } from '../../../../src/domain/group/GroupId';
import {
  InvitationScenario,
  NOW,
  invitationScenario,
  juan,
} from '../../../support/invitationScenario';
import { ana } from '../../../support/inviteLinkScenario';

interface RemoveScenario extends InvitationScenario {
  removeMember: RemoveMemberUseCase;
  activeMemberIds: () => Promise<string[]>;
}

function removeScenario(): RemoveScenario {
  const base = invitationScenario();
  return {
    ...base,
    removeMember: new RemoveMemberUseCase(base.groups, () => NOW),
    activeMemberIds: async () =>
      (await base.groups.listActiveMembers(GroupId.fromString('grp_casa')))
        .map((member) => member.userId.toString())
        .sort(),
  };
}

describe('RemoveMemberUseCase', () => {
  it('shouldRemoveMemberWhenActorIsOwner', async () => {
    const scenario = removeScenario();
    scenario.joinAs('grp_casa', 'MEMBER');

    const view = await scenario.removeMember.execute({
      actor: ana,
      groupId: 'grp_casa',
      userId: 'usr_juan',
    });

    expect(view).toEqual({
      userId: 'usr_juan',
      displayName: 'Juan',
      photoUrl: null,
      role: 'MEMBER',
      status: 'REMOVED',
      joinedAt: '2026-11-12T15:00:00.000Z',
    });
    expect(await scenario.activeMemberIds()).toEqual(['usr_ana']);
  });

  it.each(['MEMBER', 'READ_ONLY'] as const)(
    'shouldLetAdministratorRemoveMemberAndReadOnly (%s)',
    async (role) => {
      const scenario = removeScenario();
      scenario.joinAs('grp_casa', 'ADMINISTRATOR');
      scenario.addMember('grp_casa', 'usr_beto', 'Beto', role);

      const view = await scenario.removeMember.execute({
        actor: juan,
        groupId: 'grp_casa',
        userId: 'usr_beto',
      });

      expect(view.status).toBe('REMOVED');
      expect(await scenario.activeMemberIds()).toEqual(['usr_ana', 'usr_juan']);
    },
  );

  it.each([
    ['ADMINISTRATOR', 'OWNER'],
    ['ADMINISTRATOR', 'ADMINISTRATOR'],
    ['MEMBER', 'MEMBER'],
    ['READ_ONLY', 'MEMBER'],
  ] as const)(
    'shouldThrowPermissionDeniedWhenActorCannotRemoveTarget (%s removes %s)',
    async (actorRole, targetRole) => {
      const scenario = removeScenario();
      scenario.joinAs('grp_casa', actorRole);
      scenario.addMember('grp_casa', 'usr_beto', 'Beto', targetRole);

      await expect(
        scenario.removeMember.execute({ actor: juan, groupId: 'grp_casa', userId: 'usr_beto' }),
      ).rejects.toBeInstanceOf(PermissionDeniedException);
      expect(await scenario.activeMemberIds()).toEqual(['usr_ana', 'usr_beto', 'usr_juan']);
    },
  );

  it('shouldThrowGroupNotFoundWhenActorIsNotActiveMember', async () => {
    const scenario = removeScenario();
    scenario.addMember('grp_casa', 'usr_beto', 'Beto', 'MEMBER');

    await expect(
      scenario.removeMember.execute({ actor: juan, groupId: 'grp_casa', userId: 'usr_beto' }),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
    expect(await scenario.activeMemberIds()).toEqual(['usr_ana', 'usr_beto']);
  });

  it.each(['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const)(
    'shouldThrowCannotRemoveSelf (%s)',
    async (role) => {
      const scenario = removeScenario();
      scenario.joinAs('grp_casa', role);

      await expect(
        scenario.removeMember.execute({ actor: juan, groupId: 'grp_casa', userId: 'usr_juan' }),
      ).rejects.toBeInstanceOf(CannotRemoveSelfException);
      expect(await scenario.activeMemberIds()).toEqual(['usr_ana', 'usr_juan']);
    },
  );

  it.each(['usr_beto', 'usr_inexistente', '   '])(
    'shouldThrowMemberNotFoundWhenTargetIsNotActiveMember (%j)',
    async (userId) => {
      const scenario = removeScenario();
      scenario.addMember('grp_casa', 'usr_beto', 'Beto', 'MEMBER');
      await scenario.removeMember.execute({ actor: ana, groupId: 'grp_casa', userId: 'usr_beto' });

      await expect(
        scenario.removeMember.execute({ actor: ana, groupId: 'grp_casa', userId }),
      ).rejects.toBeInstanceOf(MemberNotFoundException);
    },
  );

  it('shouldThrowPermissionDeniedWhenActorLosesPermissionBeforeTheWrite', async () => {
    const scenario = removeScenario();
    scenario.joinAs('grp_casa', 'MEMBER');
    vi.spyOn(scenario.groups, 'removeMember').mockResolvedValue({ status: 'PERMISSION_DENIED' });

    await expect(
      scenario.removeMember.execute({ actor: ana, groupId: 'grp_casa', userId: 'usr_juan' }),
    ).rejects.toBeInstanceOf(PermissionDeniedException);
  });
});
