import {
  InviteLinkExpiredException,
  InviteLinkNotFoundException,
} from '../../domain/invitation/errors';
import {
  CurrentInviteLink,
  InviteLinkRepository,
} from '../../domain/invitation/InviteLinkRepository';

/** El enlace vigente de ese código; si no existe o fue reemplazado, o si venció, lanza el error que corresponde. */
export async function findValidInviteLink(
  inviteLinkRepository: InviteLinkRepository,
  hashCode: (code: string) => Promise<string>,
  code: string,
  now: Date,
): Promise<CurrentInviteLink> {
  const current = await inviteLinkRepository.findCurrentByCodeHash(await hashCode(code));
  if (current === null) {
    throw new InviteLinkNotFoundException();
  }
  if (!current.link.isValidAt(now)) {
    throw new InviteLinkExpiredException();
  }
  return current;
}
