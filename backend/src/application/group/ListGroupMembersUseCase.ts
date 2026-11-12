import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupNotFoundException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupMember, GroupRepository } from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';

export interface GroupMemberView {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: MemberRole;
  status: 'ACTIVE';
  joinedAt: string;
}

/** Orden alfabético en español: sin distinguir mayúsculas ni tildes. */
const spanishNames = new Intl.Collator('es', { sensitivity: 'base' });

function byNameThenUserId(left: GroupMember, right: GroupMember): number {
  return (
    spanishNames.compare(left.displayName, right.displayName) ||
    left.userId.toString().localeCompare(right.userId.toString())
  );
}

/** Miembros activos de un grupo, visibles solo para sus miembros activos (docs/api/Members.md). */
export class ListGroupMembersUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  async execute(command: {
    actor: AuthenticatedActor;
    groupId: string;
  }): Promise<GroupMemberView[]> {
    const groupId = GroupId.fromString(command.groupId);
    if ((await this.groupRepository.findForMember(groupId, command.actor.userId)) === null) {
      throw new GroupNotFoundException();
    }
    const members = await this.groupRepository.listActiveMembers(groupId);
    return [...members].sort(byNameThenUserId).map((member) => ({
      userId: member.userId.toString(),
      displayName: member.displayName,
      photoUrl: member.photoUrl,
      role: member.role,
      status: 'ACTIVE',
      joinedAt: member.joinedAt.toISOString(),
    }));
  }
}
