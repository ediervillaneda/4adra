import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { InvitationRepository } from '../../domain/invitation/InvitationRepository';
import { findInvitationForActor } from './findInvitationForActor';
import { InvitationView } from './InvitationView';
import { toInvitationView } from './toInvitationView';

export interface RespondInvitationCommand {
  actor: AuthenticatedActor;
  invitationId: string;
}

/** Acepta una invitación del actor: entra al grupo con el rol ofrecido (docs/api/Members.md). */
export class AcceptInvitationUseCase {
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
    const accepted = invitation.accept(now);
    await this.invitationRepository.saveAccepted(accepted, command.actor.userId, now);
    return toInvitationView(accepted);
  }
}
