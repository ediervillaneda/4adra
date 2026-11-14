import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { Invitation } from '../../domain/invitation/Invitation';
import { InvitationRepository } from '../../domain/invitation/InvitationRepository';
import { InvitationNotFoundException } from '../../domain/invitation/errors';

/** La invitación, solo si está dirigida al correo del actor; si no, no se revela que existe. */
export async function findInvitationForActor(
  invitationRepository: InvitationRepository,
  actor: AuthenticatedActor,
  invitationId: string,
): Promise<Invitation> {
  const invitation = await invitationRepository.findById(invitationId);
  if (invitation?.isAddressedTo(actor.email) !== true) {
    throw new InvitationNotFoundException();
  }
  return invitation;
}
