/** Roles de una membresía (docs/domain/Member.md, matriz de permisos en docs/Security.md). */
export const MEMBER_ROLES = ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Roles que invitan, por correo o con enlace. */
export const ROLES_THAT_INVITE: readonly MemberRole[] = ['OWNER', 'ADMINISTRATOR'];

/** Roles que editan el nombre y la descripción del grupo. */
export const ROLES_THAT_EDIT_GROUP: readonly MemberRole[] = ['OWNER', 'ADMINISTRATOR'];

/** Roles que cambian el rol de otros miembros. */
export const ROLES_THAT_CHANGE_ROLES: readonly MemberRole[] = ['OWNER'];

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === 'string' && (MEMBER_ROLES as readonly string[]).includes(value);
}

/** Quienes registran, editan y eliminan gastos (docs/Security.md); ReadOnly solo consulta. */
export const ROLES_THAT_WRITE_EXPENSES: readonly MemberRole[] = [
  'OWNER',
  'ADMINISTRATOR',
  'MEMBER',
];
