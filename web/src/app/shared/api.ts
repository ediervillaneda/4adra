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

/** Roles que se pueden asignar al invitar; `OWNER` no (docs/api/Members.md). */
export const INVITABLE_ROLES = ['ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

/** Los cuatro roles, en orden de más a menos permisos; los asigna un Owner (docs/api/Members.md). */
export const MEMBER_ROLES = ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Cuerpo de PATCH /api/v1/groups/{groupId}/members/{userId}. */
export interface RoleChangeRequest {
  role: MemberRole;
}

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

/** Membresía de un grupo, sin correo (components/schemas/Membership en openapi.yaml). */
export interface GroupMember {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: MemberRole;
  /** `REMOVED` solo en la respuesta de remover; las listas traen solo miembros activos. */
  status: 'ACTIVE' | 'REMOVED';
  joinedAt: string;
}

/** Cuerpo de PATCH /api/v1/groups/{groupId}: los dos campos son obligatorios. */
export interface GroupChangesRequest {
  name: string;
  description: string | null;
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

/** Enlace recién creado; el código solo llega aquí (components/schemas/InviteLink). */
export interface InviteLink {
  groupId: string;
  code: string;
  expiresAt: string;
}

/** A qué grupo invita un enlace vigente (components/schemas/InviteLinkPreview). */
export interface InviteLinkPreview {
  groupId: string;
  groupName: string;
  expiresAt: string;
}

/** Membresía después de unirse con un enlace (components/schemas/JoinedMembership). */
export interface JoinedMembership {
  groupId: string;
  userId: string;
  role: MemberRole;
  status: 'ACTIVE';
  joinedAt: string;
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

/** Un gasto (schema Expense de docs/api/openapi.yaml). Los montos son decimales exactos en texto. */
export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  paidBy: string;
  originalAmount: string;
  currency: string;
  exchangeRate: string;
  convertedAmount: string;
  calculationProfileVersion: number;
  expenseDate: string;
  split: { type: 'EQUAL'; participants: { userId: string; amount: string }[] };
  status: 'ACTIVE' | 'DELETED';
  resourceVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo de POST /api/v1/groups/{groupId}/expenses (por ahora solo reparto EQUAL). */
export interface NewExpenseRequest {
  title: string;
  description: string | null;
  paidBy: string;
  amount: string;
  currency: string;
  expenseDate: string;
  split: { type: 'EQUAL'; participants: { userId: string }[] };
}
