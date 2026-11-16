import { Group } from '../../src/domain/group/Group';
import { GroupId } from '../../src/domain/group/GroupId';
import {
  GroupMember,
  GroupMembership,
  GroupRepository,
  GroupUpdateResult,
  LeaveGroupResult,
  MemberGroup,
  MemberRemovalResult,
  RoleChangeResult,
} from '../../src/domain/group/GroupRepository';
import { MemberRole, ROLES_THAT_EDIT_GROUP } from '../../src/domain/group/MemberRole';
import { GroupDetails } from '../../src/domain/group/GroupDetails';
import { canRemove } from '../../src/domain/group/canRemove';
import { Email } from '../../src/domain/user/Email';
import { UserId } from '../../src/domain/user/UserId';
import { InMemoryUserRepository } from './InMemoryUserRepository';

interface StoredMembership {
  groupId: string;
  userId: string;
  role: MemberRole;
  status: 'ACTIVE' | 'REMOVED';
  /** Si falta, se toma la fecha de creación del grupo. */
  joinedAt?: Date;
  /** Última vez que cambió la membresía; si falta, nunca cambió. */
  updatedAt?: Date;
}

/** Como la D1 (que une `group_members` con `users`), toma nombre y foto de los perfiles guardados. */
export class InMemoryGroupRepository implements GroupRepository {
  constructor(private readonly users: InMemoryUserRepository = new InMemoryUserRepository()) {}

  private readonly groupsById = new Map<string, Group>();
  private readonly memberships: StoredMembership[] = [];

  seedMembership(group: Group, membership: StoredMembership): void {
    this.groupsById.set(group.id.toString(), group);
    this.memberships.push(membership);
  }

  membershipOf(groupId: GroupId, userId: UserId): StoredMembership | null {
    return (
      this.memberships.find(
        (entry) => entry.groupId === groupId.toString() && entry.userId === userId.toString(),
      ) ?? null
    );
  }

  /** Como el `UPDATE … WHERE EXISTS` de D1: solo un Owner o Administrator activo cambia el grupo. */
  async updateDetails(
    groupId: GroupId,
    actorId: UserId,
    details: GroupDetails,
    at: Date,
  ): Promise<GroupUpdateResult> {
    const memberGroup = await this.findForMember(groupId, actorId);
    if (memberGroup === null) {
      return { status: 'NOT_MEMBER' };
    }
    if (!ROLES_THAT_EDIT_GROUP.includes(memberGroup.role)) {
      return { status: 'PERMISSION_DENIED' };
    }
    const edited = memberGroup.group.withDetails(details, at);
    this.groupsById.set(groupId.toString(), edited);
    return { status: 'UPDATED', memberGroup: { group: edited, role: memberGroup.role } };
  }

  groupById(groupId: GroupId): Group | null {
    return this.groupsById.get(groupId.toString()) ?? null;
  }

  /**
   * Como el `INSERT … ON CONFLICT … DO UPDATE … WHERE status = 'REMOVED'` de D1: una membresía activa
   * no se toca; una removida se reactiva con el rol nuevo y la fecha de ingreso nueva.
   */
  joinIfAbsent(groupId: GroupId, userId: UserId, role: MemberRole, at?: Date): StoredMembership {
    const existing = this.memberships.find(
      (entry) => entry.groupId === groupId.toString() && entry.userId === userId.toString(),
    );
    if (existing?.status === 'REMOVED') {
      existing.status = 'ACTIVE';
      existing.role = role;
      if (at !== undefined) {
        existing.joinedAt = at;
        existing.updatedAt = at;
      }
      return existing;
    }
    if (existing !== undefined) {
      return existing;
    }
    const created: StoredMembership = {
      groupId: groupId.toString(),
      userId: userId.toString(),
      role,
      status: 'ACTIVE',
      ...(at === undefined ? {} : { joinedAt: at }),
    };
    this.memberships.push(created);
    return created;
  }

  addMemberIfAbsent(
    groupId: GroupId,
    userId: UserId,
    role: MemberRole,
    at: Date,
  ): Promise<GroupMembership> {
    const membership = this.joinIfAbsent(groupId, userId, role, at);
    return Promise.resolve({
      role: membership.role,
      joinedAt: membership.joinedAt ?? (this.groupsById.get(membership.groupId) as Group).createdAt,
    });
  }

  /** Como el `UPDATE … WHERE` de D1: no toca nada si el actor no es Owner, la persona no es miembro activo o el grupo quedaría sin Owner. */
  async changeMemberRole(
    groupId: GroupId,
    actorId: UserId,
    userId: UserId,
    role: MemberRole,
    at: Date,
  ): Promise<RoleChangeResult> {
    const activeInGroup = this.memberships.filter(
      (entry) => entry.groupId === groupId.toString() && entry.status === 'ACTIVE',
    );
    const actor = activeInGroup.find((entry) => entry.userId === actorId.toString());
    if (actor?.role !== 'OWNER') {
      return { status: 'PERMISSION_DENIED' };
    }
    const target = activeInGroup.find((entry) => entry.userId === userId.toString());
    if (target === undefined) {
      return { status: 'MEMBER_NOT_FOUND' };
    }
    const owners = activeInGroup.filter((entry) => entry.role === 'OWNER').length;
    if (role !== 'OWNER' && target.role === 'OWNER' && owners <= 1) {
      return { status: 'LAST_OWNER' };
    }
    target.role = role;
    target.updatedAt = at;
    const members = await this.listActiveMembers(groupId);
    const member = members.find((entry) => entry.userId.toString() === userId.toString());
    return member === undefined ? { status: 'MEMBER_NOT_FOUND' } : { status: 'CHANGED', member };
  }

  /** Como el `UPDATE … WHERE` de D1: no toca nada si el actor no puede remover a la persona o ella no es miembro activo. */
  async removeMember(
    groupId: GroupId,
    actorId: UserId,
    userId: UserId,
    at: Date,
  ): Promise<MemberRemovalResult> {
    const activeInGroup = this.memberships.filter(
      (entry) => entry.groupId === groupId.toString() && entry.status === 'ACTIVE',
    );
    const target = activeInGroup.find((entry) => entry.userId === userId.toString());
    if (target === undefined) {
      return { status: 'MEMBER_NOT_FOUND' };
    }
    const actor = activeInGroup.find((entry) => entry.userId === actorId.toString());
    if (actor === undefined || actor === target || !canRemove(actor.role, target.role)) {
      return { status: 'PERMISSION_DENIED' };
    }
    const member = (await this.listActiveMembers(groupId)).find(
      (entry) => entry.userId.toString() === userId.toString(),
    );
    target.status = 'REMOVED';
    target.updatedAt = at;
    return member === undefined
      ? { status: 'MEMBER_NOT_FOUND' }
      : { status: 'REMOVED', member: { ...member, status: 'REMOVED' } };
  }

  /** Como el `UPDATE … WHERE` de D1: no toca nada si no es miembro activo o es el único Owner. */
  async leaveGroup(groupId: GroupId, userId: UserId, at: Date): Promise<LeaveGroupResult> {
    const activeInGroup = this.memberships.filter(
      (entry) => entry.groupId === groupId.toString() && entry.status === 'ACTIVE',
    );
    const leaving = activeInGroup.find((entry) => entry.userId === userId.toString());
    if (leaving === undefined) {
      return { status: 'NOT_MEMBER' };
    }
    const owners = activeInGroup.filter((entry) => entry.role === 'OWNER').length;
    if (leaving.role === 'OWNER' && owners <= 1) {
      return { status: 'LAST_OWNER' };
    }
    const member = (await this.listActiveMembers(groupId)).find(
      (entry) => entry.userId.toString() === userId.toString(),
    );
    leaving.status = 'REMOVED';
    leaving.updatedAt = at;
    return member === undefined
      ? { status: 'NOT_MEMBER' }
      : { status: 'LEFT', member: { ...member, status: 'REMOVED' } };
  }

  createWithOwner(group: Group): Promise<void> {
    this.seedMembership(group, {
      groupId: group.id.toString(),
      userId: group.createdBy.toString(),
      role: 'OWNER',
      status: 'ACTIVE',
    });
    return Promise.resolve();
  }

  listForMember(userId: UserId): Promise<MemberGroup[]> {
    return Promise.resolve(
      this.memberships
        .filter((entry) => entry.userId === userId.toString() && entry.status === 'ACTIVE')
        .map((entry) => ({ group: this.groupsById.get(entry.groupId) as Group, role: entry.role })),
    );
  }

  async findForMember(groupId: GroupId, userId: UserId): Promise<MemberGroup | null> {
    const groups = await this.listForMember(userId);
    return groups.find((entry) => entry.group.id.toString() === groupId.toString()) ?? null;
  }

  async listActiveMembers(groupId: GroupId): Promise<GroupMember[]> {
    const active = this.memberships.filter(
      (entry) => entry.groupId === groupId.toString() && entry.status === 'ACTIVE',
    );
    const members: GroupMember[] = [];
    for (const entry of active) {
      const user = await this.users.findById(UserId.fromString(entry.userId));
      if (user !== null) {
        members.push({
          userId: user.id,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
          role: entry.role,
          status: 'ACTIVE',
          joinedAt: entry.joinedAt ?? (this.groupsById.get(entry.groupId) as Group).createdAt,
        });
      }
    }
    return members;
  }

  async hasActiveMemberWithEmail(groupId: GroupId, email: Email): Promise<boolean> {
    for (const entry of this.memberships) {
      if (entry.groupId !== groupId.toString() || entry.status !== 'ACTIVE') {
        continue;
      }
      const user = await this.users.findById(UserId.fromString(entry.userId));
      if (user?.email.toString() === email.toString()) {
        return true;
      }
    }
    return false;
  }
}
