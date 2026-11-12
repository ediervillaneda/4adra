import { Group } from './Group';
import { GroupId } from './GroupId';
import { MemberRole } from './MemberRole';
import { Email } from '../user/Email';
import { UserId } from '../user/UserId';

/** Un grupo visto por uno de sus miembros activos, con el rol que tiene en él. */
export interface MemberGroup {
  group: Group;
  role: MemberRole;
}

/** Un miembro activo de un grupo, con los datos públicos de su perfil (sin correo). */
export interface GroupMember {
  userId: UserId;
  displayName: string;
  photoUrl: string | null;
  role: MemberRole;
  joinedAt: Date;
}

export interface GroupRepository {
  /** Guarda el grupo y la membresía OWNER de su creador en una sola operación atómica. */
  createWithOwner(group: Group): Promise<void>;
  /** Grupos donde el usuario tiene una membresía activa. */
  listForMember(userId: UserId): Promise<MemberGroup[]>;
  /** El grupo, solo si el usuario tiene en él una membresía activa; si no, `null`. */
  findForMember(groupId: GroupId, userId: UserId): Promise<MemberGroup | null>;
  /** Miembros activos del grupo, sin orden garantizado. */
  listActiveMembers(groupId: GroupId): Promise<GroupMember[]>;
  /** Si el correo es de un miembro activo del grupo. */
  hasActiveMemberWithEmail(groupId: GroupId, email: Email): Promise<boolean>;
}
