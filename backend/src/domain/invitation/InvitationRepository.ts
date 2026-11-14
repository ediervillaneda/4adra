import { GroupId } from '../group/GroupId';
import { Email } from '../user/Email';
import { UserId } from '../user/UserId';
import { Invitation } from './Invitation';

/** Invitación vista por su destinatario: el nombre del grupo y el de quien invita, sin su correo. */
export interface ReceivedInvitation {
  invitation: Invitation;
  groupName: string;
  invitedByName: string;
}

export interface InvitationRepository {
  /** La invitación `PENDING` más reciente de ese correo en el grupo, vencida o no. */
  findPending(groupId: GroupId, email: Email): Promise<Invitation | null>;
  /** Invitaciones `PENDING` dirigidas a ese correo, vencidas o no. */
  listPendingFor(email: Email): Promise<ReceivedInvitation[]>;
  findById(invitationId: string): Promise<Invitation | null>;
  save(invitation: Invitation): Promise<void>;
  /**
   * En una sola operación atómica: guarda la invitación aceptada y suma al usuario como miembro
   * activo con el rol ofrecido, salvo que ya tenga membresía en el grupo (entonces no la toca).
   * Si la invitación ya no estaba `PENDING` (otra respuesta llegó antes), no cambia nada y lanza
   * `InvitationAlreadyRespondedException`.
   */
  saveAccepted(accepted: Invitation, member: UserId, at: Date): Promise<void>;
  /** Igual que `saveAccepted`: si ya no estaba `PENDING`, lanza `InvitationAlreadyRespondedException`. */
  saveDeclined(declined: Invitation, at: Date): Promise<void>;
}
