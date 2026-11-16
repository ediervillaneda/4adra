import { Group } from './Group';
import { GroupId } from './GroupId';
import { GroupDetails } from './GroupDetails';
import { MemberRole } from './MemberRole';
import { Email } from '../user/Email';
import { UserId } from '../user/UserId';

/** Un grupo visto por uno de sus miembros activos, con el rol que tiene en él. */
export interface MemberGroup {
  group: Group;
  role: MemberRole;
}

/** Un miembro de un grupo, con los datos públicos de su perfil (sin correo). */
export interface GroupMember {
  userId: UserId;
  displayName: string;
  photoUrl: string | null;
  role: MemberRole;
  /** `REMOVED` solo en el resultado de removerlo; las listas traen miembros activos. */
  status: 'ACTIVE' | 'REMOVED';
  joinedAt: Date;
}

/** La membresía de un usuario en un grupo. */
export interface GroupMembership {
  role: MemberRole;
  joinedAt: Date;
}

/** Resultado de cambiar un rol: el miembro con su rol nuevo, o por qué no cambió nada. */
export type RoleChangeResult =
  | { status: 'CHANGED'; member: GroupMember }
  | { status: 'PERMISSION_DENIED' }
  | { status: 'MEMBER_NOT_FOUND' }
  | { status: 'LAST_OWNER' };

/** Resultado de remover a un miembro: el miembro tal como quedó, o por qué no cambió nada. */
export type MemberRemovalResult =
  | { status: 'REMOVED'; member: GroupMember }
  | { status: 'PERMISSION_DENIED' }
  | { status: 'MEMBER_NOT_FOUND' };

/** Resultado de que el actor salga del grupo: su membresía tal como quedó, o por qué no salió. */
export type LeaveGroupResult =
  { status: 'LEFT'; member: GroupMember } | { status: 'LAST_OWNER' } | { status: 'NOT_MEMBER' };

/** Resultado de editar un grupo: el grupo como quedó (visto por el actor), o por qué no cambió. */
export type GroupUpdateResult =
  | { status: 'UPDATED'; memberGroup: MemberGroup }
  | { status: 'PERMISSION_DENIED' }
  | { status: 'NOT_MEMBER' };

export interface GroupRepository {
  /** Guarda el grupo y la membresía OWNER de su creador en una sola operación atómica. */
  createWithOwner(group: Group): Promise<void>;
  /**
   * El actor (Owner o Administrator activo) cambia nombre y descripción del grupo: sube la versión en
   * uno y actualiza `updatedAt`. El permiso se vuelve a evaluar en la misma escritura.
   */
  updateDetails(
    groupId: GroupId,
    actorId: UserId,
    details: GroupDetails,
    at: Date,
  ): Promise<GroupUpdateResult>;
  /** Grupos donde el usuario tiene una membresía activa. */
  listForMember(userId: UserId): Promise<MemberGroup[]>;
  /** El grupo, solo si el usuario tiene en él una membresía activa; si no, `null`. */
  findForMember(groupId: GroupId, userId: UserId): Promise<MemberGroup | null>;
  /** Miembros activos del grupo, sin orden garantizado. */
  listActiveMembers(groupId: GroupId): Promise<GroupMember[]>;
  /** Si el correo es de un miembro activo del grupo. */
  hasActiveMemberWithEmail(groupId: GroupId, email: Email): Promise<boolean>;
  /**
   * Suma al usuario con ese rol, salvo que ya sea miembro activo (entonces no la toca), y devuelve
   * la membresía que queda. Una membresía REMOVED se reactiva con ese rol y una fecha de ingreso nueva.
   */
  addMemberIfAbsent(
    groupId: GroupId,
    userId: UserId,
    role: MemberRole,
    at: Date,
  ): Promise<GroupMembership>;
  /**
   * El actor (Owner activo) cambia el rol de un miembro activo, salvo que el grupo quede sin Owner
   * activo. Ambas condiciones se evalúan en la misma escritura, para que cambios simultáneos no las burlen.
   */
  changeMemberRole(
    groupId: GroupId,
    actorId: UserId,
    userId: UserId,
    role: MemberRole,
    at: Date,
  ): Promise<RoleChangeResult>;
  /**
   * El actor remueve a un miembro activo (la membresía pasa a REMOVED, nunca se borra). El permiso
   * del actor (`canRemove`) se vuelve a evaluar en la misma escritura.
   */
  removeMember(
    groupId: GroupId,
    actorId: UserId,
    userId: UserId,
    at: Date,
  ): Promise<MemberRemovalResult>;
  /**
   * El usuario sale del grupo (su membresía pasa a REMOVED, nunca se borra), salvo que sea el único
   * Owner activo. La condición se evalúa en la misma escritura.
   */
  leaveGroup(groupId: GroupId, userId: UserId, at: Date): Promise<LeaveGroupResult>;
}
