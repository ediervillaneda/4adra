import { Group } from '../../src/domain/group/Group';
import { GroupRepository, MemberGroup } from '../../src/domain/group/GroupRepository';
import { MemberRole } from '../../src/domain/group/MemberRole';
import { UserId } from '../../src/domain/user/UserId';

interface StoredMembership {
  groupId: string;
  userId: string;
  role: MemberRole;
  status: 'ACTIVE' | 'REMOVED';
}

export class InMemoryGroupRepository implements GroupRepository {
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
}
