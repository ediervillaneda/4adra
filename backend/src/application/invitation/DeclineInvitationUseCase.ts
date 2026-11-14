import { InvitationRepository } from '../../domain/invitation/InvitationRepository';
import { RespondInvitationCommand } from './AcceptInvitationUseCase';
import { findInvitationForActor } from './findInvitationForActor';
import { InvitationView } from './InvitationView';
import { toInvitationView } from './toInvitationView';

/** Rechaza una invitación del actor sin sumarlo al grupo (docs/api/Members.md). */
export class DeclineInvitationUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: RespondInvitationCommand): Promise<InvitationView> {
    const invitation = await findInvitationForActor(
      this.invitationRepository,
      command.actor,
      command.invitationId,
    );
    const now = this.now();
    const declined = invitation.decline(now);
    await this.invitationRepository.saveDeclined(declined, now);
    return toInvitationView(declined);
  }
}
