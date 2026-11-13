import { InvitableRole } from '../../domain/invitation/Invitation';

/** Forma pública de una invitación recibida (`ReceivedInvitation` en docs/api/openapi.yaml). */
export interface ReceivedInvitationView {
  invitationId: string;
  groupId: string;
  groupName: string;
  invitedByName: string;
  role: InvitableRole;
  expiresAt: string;
}
