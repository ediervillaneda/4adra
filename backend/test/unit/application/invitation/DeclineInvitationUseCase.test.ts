import { describe, it, expect } from 'vitest';
import { DeclineInvitationUseCase } from '../../../../src/application/invitation/DeclineInvitationUseCase';
import { GroupId } from '../../../../src/domain/group/GroupId';
import {
  InvitationAlreadyRespondedException,
  InvitationExpiredException,
  InvitationNotFoundException,
} from '../../../../src/domain/invitation/errors';
import { NOW, invitationScenario, juan } from '../../../support/invitationScenario';

const casa = GroupId.fromString('grp_casa');

describe('DeclineInvitationUseCase', () => {
  it('shouldMarkInvitationDeclinedWithoutJoiningGroup', async () => {
    const { groups, invitations, seedInvitation, statusOf } = invitationScenario();
    seedInvitation({ id: 'inv_casa', groupId: 'grp_casa', role: 'MEMBER' });
    const useCase = new DeclineInvitationUseCase(invitations, () => NOW);

    const view = await useCase.execute({ actor: juan, invitationId: 'inv_casa' });

    expect(view).toEqual({
      invitationId: 'inv_casa',
      groupId: 'grp_casa',
      email: 'juan@example.com',
      role: 'MEMBER',
      status: 'DECLINED',
      expiresAt: '2026-11-19T15:00:00.000Z',
    });
    expect(statusOf('inv_casa')).toBe('DECLINED');
    expect(await groups.findForMember(casa, juan.userId)).toBeNull();
  });

  it.each([
    { invitationId: 'inv_inexistente', error: InvitationNotFoundException },
    { invitationId: 'inv_eva', error: InvitationNotFoundException },
    { invitationId: 'inv_vencida', error: InvitationExpiredException },
    { invitationId: 'inv_aceptada', error: InvitationAlreadyRespondedException },
  ])(
    'shouldRejectAndChangeNothingWhenInvitationCannotBeDeclined ($invitationId)',
    async ({ invitationId, error }) => {
      const { invitations, seedInvitation, statusOf } = invitationScenario();
      seedInvitation({ id: 'inv_eva', email: 'eva@example.com' });
      seedInvitation({ id: 'inv_vencida', createdAt: new Date('2026-11-06T12:00:00.000Z') });
      seedInvitation({ id: 'inv_aceptada', status: 'ACCEPTED' });
      const useCase = new DeclineInvitationUseCase(invitations, () => NOW);

      await expect(useCase.execute({ actor: juan, invitationId })).rejects.toBeInstanceOf(error);
      expect(statusOf('inv_eva')).toBe('PENDING');
      expect(statusOf('inv_vencida')).toBe('PENDING');
      expect(statusOf('inv_aceptada')).toBe('ACCEPTED');
    },
  );
});
