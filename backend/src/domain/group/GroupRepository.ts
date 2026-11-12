import { Group } from './Group';
import { MemberRole } from './MemberRole';
import { UserId } from '../user/UserId';

/** Un grupo visto por uno de sus miembros activos, con el rol que tiene en él. */
export interface MemberGroup {
  group: Group;
  role: MemberRole;
}

export interface GroupRepository {
  /** Guarda el grupo y la membresía OWNER de su creador en una sola operación atómica. */
  createWithOwner(group: Group): Promise<void>;
  /** Grupos donde el usuario tiene una membresía activa. */
  listForMember(userId: UserId): Promise<MemberGroup[]>;
}
