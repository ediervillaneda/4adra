import { Invitation } from '../../domain/invitation/Invitation';
import { InvitationView } from './InvitationView';

export function toInvitationView(invitation: Invitation): InvitationView {
  return {
    invitationId: invitation.id,
    groupId: invitation.groupId.toString(),
    email: invitation.email.toString(),
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}
