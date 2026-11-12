import { GroupId } from '../group/GroupId';
import { Email } from '../user/Email';
import { Invitation } from './Invitation';

export interface InvitationRepository {
  /** La invitación `PENDING` más reciente de ese correo en el grupo, vencida o no. */
  findPending(groupId: GroupId, email: Email): Promise<Invitation | null>;
  save(invitation: Invitation): Promise<void>;
}
