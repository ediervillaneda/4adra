import { describe, it, expect } from 'vitest';
import { ListMyInvitationsUseCase } from '../../../../src/application/invitation/ListMyInvitationsUseCase';
import { ArchiveGroupUseCase } from '../../../../src/application/group/ArchiveGroupUseCase';
import { NOW, invitationScenario, juan } from '../../../support/invitationScenario';
import { ana } from '../../../support/inviteLinkScenario';

describe('ListMyInvitationsUseCase', () => {
  it('shouldListPendingInvitationWithGroupNameInviterNameAndRole', async () => {
    const { invitations, seedInvitation } = invitationScenario();
    seedInvitation({ id: 'inv_casa', groupId: 'grp_casa', role: 'ADMINISTRATOR' });
    const useCase = new ListMyInvitationsUseCase(invitations, () => NOW);

    const views = await useCase.execute(juan);

    expect(views).toEqual([
      {
        invitationId: 'inv_casa',
        groupId: 'grp_casa',
        groupName: 'Casa',
        invitedByName: 'Ana',
        role: 'ADMINISTRATOR',
        expiresAt: '2026-11-19T15:00:00.000Z',
      },
    ]);
  });

  it('shouldExcludeExpiredAnsweredAndOtherEmailsInvitations', async () => {
    const { invitations, seedInvitation } = invitationScenario();
    seedInvitation({ id: 'inv_vigente', groupId: 'grp_casa' });
    seedInvitation({
      id: 'inv_vencida',
      groupId: 'grp_playa',
      createdAt: new Date('2026-11-06T12:00:00.000Z'),
    });
    seedInvitation({ id: 'inv_aceptada', groupId: 'grp_playa', status: 'ACCEPTED' });
    seedInvitation({ id: 'inv_rechazada', groupId: 'grp_playa', status: 'DECLINED' });
    seedInvitation({ id: 'inv_revocada', groupId: 'grp_playa', status: 'REVOKED' });
    seedInvitation({ id: 'inv_eva', groupId: 'grp_playa', email: 'eva@example.com' });
    const useCase = new ListMyInvitationsUseCase(invitations, () => NOW);

    const views = await useCase.execute(juan);

    expect(views.map((view) => view.invitationId)).toEqual(['inv_vigente']);
  });

  it('shouldReturnEmptyListWhenActorHasNoInvitations', async () => {
    const { invitations } = invitationScenario();
    const useCase = new ListMyInvitationsUseCase(invitations, () => NOW);

    expect(await useCase.execute(juan)).toEqual([]);
  });

  it('shouldExcludeInvitationsToArchivedGroups', async () => {
    const { groups, invitations, seedInvitation } = invitationScenario();
    seedInvitation({ id: 'inv_casa', groupId: 'grp_casa' });
    seedInvitation({ id: 'inv_playa', groupId: 'grp_playa' });
    await new ArchiveGroupUseCase(groups, () => NOW).execute({ actor: ana, groupId: 'grp_casa' });
    const useCase = new ListMyInvitationsUseCase(invitations, () => NOW);

    const views = await useCase.execute(juan);

    expect(views.map((view) => view.invitationId)).toEqual(['inv_playa']);
  });
});
