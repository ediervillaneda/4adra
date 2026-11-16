import { Group } from '../../src/domain/group/Group';
import { GroupId } from '../../src/domain/group/GroupId';
import {
  GroupMember,
  GroupMembership,
  GroupRepository,
  MemberGroup,
  RoleChangeResult,
} from '../../src/domain/group/GroupRepository';
import { MemberRole } from '../../src/domain/group/MemberRole';
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

  groupById(groupId: GroupId): Group | null {
    return this.groupsById.get(groupId.toString()) ?? null;
  }

  /** Como `INSERT … ON CONFLICT (group_id, user_id) DO NOTHING`: si ya hay membresía, no la toca. */
  joinIfAbsent(groupId: GroupId, userId: UserId, role: MemberRole, at?: Date): StoredMembership {
    const existing = this.memberships.find(
      (entry) => entry.groupId === groupId.toString() && entry.userId === userId.toString(),
    );
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
