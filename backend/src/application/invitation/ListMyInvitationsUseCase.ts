import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { InvitationRepository } from '../../domain/invitation/InvitationRepository';
import { ReceivedInvitationView } from './ReceivedInvitationView';

/** Invitaciones pendientes y vigentes dirigidas al correo del actor (docs/api/Members.md). */
export class ListMyInvitationsUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly now: () => Date,
  ) {}

  async execute(actor: AuthenticatedActor): Promise<ReceivedInvitationView[]> {
    const now = this.now();
    const received = await this.invitationRepository.listPendingFor(actor.email);
    return received
      .filter(({ invitation }) => invitation.isPendingAt(now))
      .map(({ invitation, groupName, invitedByName }) => ({
        invitationId: invitation.id,
        groupId: invitation.groupId.toString(),
        groupName,
        invitedByName,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
      }));
  }
}
