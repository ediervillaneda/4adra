import { InvitableRole, InvitationStatus } from '../../domain/invitation/Invitation';

/** Forma pública de una invitación (`Invitation` en docs/api/openapi.yaml). */
export interface InvitationView {
  invitationId: string;
  groupId: string;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  expiresAt: string;
}
