import { Group } from '../../src/domain/group/Group';
import { GroupId } from '../../src/domain/group/GroupId';
import { GroupMember, GroupRepository, MemberGroup } from '../../src/domain/group/GroupRepository';
import { MemberRole } from '../../src/domain/group/MemberRole';
import { UserId } from '../../src/domain/user/UserId';
import { InMemoryUserRepository } from './InMemoryUserRepository';

interface StoredMembership {
  groupId: string;
  userId: string;
  role: MemberRole;
  status: 'ACTIVE' | 'REMOVED';
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
          joinedAt: (this.groupsById.get(entry.groupId) as Group).createdAt,
        });
      }
    }
    return members;
  }
}
