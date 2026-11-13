import { describe, it, expect } from 'vitest';
import { AcceptInvitationUseCase } from '../../../../src/application/invitation/AcceptInvitationUseCase';
import { GroupId } from '../../../../src/domain/group/GroupId';
import {
  InvitationAlreadyRespondedException,
  InvitationExpiredException,
  InvitationNotFoundException,
} from '../../../../src/domain/invitation/errors';
import { NOW, invitationScenario, juan } from '../../../support/invitationScenario';

const casa = GroupId.fromString('grp_casa');

describe('AcceptInvitationUseCase', () => {
  it('shouldJoinGroupWithOfferedRoleAndMarkInvitationAccepted', async () => {
    const { groups, invitations, seedInvitation, statusOf } = invitationScenario();
    seedInvitation({ id: 'inv_casa', groupId: 'grp_casa', role: 'ADMINISTRATOR' });
    const useCase = new AcceptInvitationUseCase(invitations, () => NOW);

    const view = await useCase.execute({ actor: juan, invitationId: 'inv_casa' });

    expect(view).toEqual({
      invitationId: 'inv_casa',
      groupId: 'grp_casa',
      email: 'juan@example.com',
      role: 'ADMINISTRATOR',
      status: 'ACCEPTED',
      expiresAt: '2026-11-19T15:00:00.000Z',
    });
    expect((await groups.findForMember(casa, juan.userId))?.role).toBe('ADMINISTRATOR');
    expect(statusOf('inv_casa')).toBe('ACCEPTED');
  });

  it.each(['inv_inexistente', 'inv_eva'])(
    'shouldThrowInvitationNotFoundWhenInvitationIsMissingOrForAnotherEmail (%s)',
    async (invitationId) => {
      const { groups, invitations, seedInvitation, statusOf } = invitationScenario();
      seedInvitation({ id: 'inv_eva', groupId: 'grp_casa', email: 'eva@example.com' });
      const useCase = new AcceptInvitationUseCase(invitations, () => NOW);

      await expect(useCase.execute({ actor: juan, invitationId })).rejects.toBeInstanceOf(
        InvitationNotFoundException,
      );
      expect(statusOf('inv_eva')).toBe('PENDING');
      expect(await groups.findForMember(casa, juan.userId)).toBeNull();
    },
  );

  it('shouldThrowInvitationExpiredAndChangeNothing', async () => {
    const { groups, invitations, seedInvitation, statusOf } = invitationScenario();
    seedInvitation({ id: 'inv_casa', createdAt: new Date('2026-11-06T12:00:00.000Z') });
    const useCase = new AcceptInvitationUseCase(invitations, () => NOW);

    await expect(useCase.execute({ actor: juan, invitationId: 'inv_casa' })).rejects.toBeInstanceOf(
      InvitationExpiredException,
    );
    expect(statusOf('inv_casa')).toBe('PENDING');
    expect(await groups.findForMember(casa, juan.userId)).toBeNull();
  });

  it.each(['ACCEPTED', 'DECLINED', 'REVOKED'] as const)(
    'shouldThrowInvitationAlreadyRespondedAndChangeNothing (%s)',
    async (status) => {
      const { groups, invitations, seedInvitation, statusOf } = invitationScenario();
      seedInvitation({ id: 'inv_casa', status });
      const useCase = new AcceptInvitationUseCase(invitations, () => NOW);

      await expect(
        useCase.execute({ actor: juan, invitationId: 'inv_casa' }),
      ).rejects.toBeInstanceOf(InvitationAlreadyRespondedException);
      expect(statusOf('inv_casa')).toBe(status);
      expect(await groups.findForMember(casa, juan.userId)).toBeNull();
    },
  );

  it('shouldCloseInvitationKeepingRoleWhenActorIsAlreadyActiveMember', async () => {
    const { groups, invitations, seedInvitation, joinAs, statusOf } = invitationScenario();
    joinAs('grp_casa', 'MEMBER');
    seedInvitation({ id: 'inv_casa', groupId: 'grp_casa', role: 'ADMINISTRATOR' });
    const useCase = new AcceptInvitationUseCase(invitations, () => NOW);

    const view = await useCase.execute({ actor: juan, invitationId: 'inv_casa' });

    expect(view.status).toBe('ACCEPTED');
    expect(statusOf('inv_casa')).toBe('ACCEPTED');
    const juanMemberships = (await groups.listActiveMembers(casa)).filter(
      (member) => member.userId.toString() === 'usr_juan',
    );
    expect(juanMemberships.map((member) => member.role)).toEqual(['MEMBER']);
  });
});
