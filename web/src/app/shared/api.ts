/** Tipos de la API del Worker (docs/api/openapi.yaml, docs/api/Auth.md). */

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'GTQ'] as const;
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

/** Campos que el usuario puede cambiar con PATCH /api/v1/me. La foto viene de Google. */
export interface ProfileChanges {
  displayName: string;
  preferredCurrency: string;
  language: string;
  timeZone: string;
}

export type MemberRole = 'OWNER' | 'ADMINISTRATOR' | 'MEMBER' | 'READ_ONLY';

/** Roles que se pueden asignar al invitar; `OWNER` no (docs/api/Members.md). */
export const INVITABLE_ROLES = ['ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

/** Cuerpo de POST /api/v1/groups/{groupId}/members/invitations. */
export interface InvitationRequest {
  email: string;
  role: InvitableRole;
}

/** components/schemas/Invitation en openapi.yaml. */
export interface Invitation {
  invitationId: string;
  groupId: string;
  email: string;
  role: InvitableRole;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
}

/** Invitación pendiente y vigente para quien inició sesión (components/schemas/ReceivedInvitation). */
export interface ReceivedInvitation {
  invitationId: string;
  groupId: string;
  groupName: string;
  invitedByName: string;
  role: InvitableRole;
  expiresAt: string;
}

/** Miembro activo de un grupo, sin correo (components/schemas/Membership en openapi.yaml). */
export interface GroupMember {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: MemberRole;
  status: 'ACTIVE';
  joinedAt: string;
}

/** Grupo visto por uno de sus miembros (components/schemas/Group en openapi.yaml). */
export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  defaultCurrency: string;
  status: 'ACTIVE' | 'ARCHIVED';
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de POST /api/v1/groups. */
export interface NewGroupRequest {
  name: string;
  description: string | null;
  defaultCurrency: string;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: { requestId: string };
}

export interface ApiErrorDetail {
  field?: string;
  reason?: string;
}

export interface ApiErrorEnvelope {
  error: { code: string; message: string; details?: ApiErrorDetail[] };
  meta?: { requestId?: string };
}
