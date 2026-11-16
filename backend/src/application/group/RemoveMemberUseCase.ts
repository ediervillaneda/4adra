import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { canRemove } from '../../domain/group/canRemove';
import {
  CannotRemoveSelfException,
  GroupNotFoundException,
  MemberNotFoundException,
  PermissionDeniedException,
} from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { UserId } from '../../domain/user/UserId';
import { GroupMemberView, toGroupMemberView } from './toGroupMemberView';

export interface RemoveMemberCommand {
  actor: AuthenticatedActor;
  groupId: string;
  userId: string;
}

/**
 * Owner o Administrator remueve a un miembro activo según `canRemove`; nadie se remueve a sí mismo
 * (docs/api/Members.md).
 */
export class RemoveMemberUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<GroupMemberView> {
    const groupId = GroupId.fromString(command.groupId);
    const actorGroup = await this.groupRepository.findForMember(groupId, command.actor.userId);
    if (actorGroup === null) {
      throw new GroupNotFoundException();
    }
    actorGroup.group.ensureActive();
    if (command.userId === command.actor.userId.toString()) {
      throw new CannotRemoveSelfException();
    }

    const members = await this.groupRepository.listActiveMembers(groupId);
    const target = members.find((member) => member.userId.toString() === command.userId);
    if (target === undefined) {
      throw new MemberNotFoundException();
    }
    if (!canRemove(actorGroup.role, target.role)) {
      throw new PermissionDeniedException();
    }

    const result = await this.groupRepository.removeMember(
      groupId,
      command.actor.userId,
      UserId.fromString(command.userId),
      this.now(),
    );
    // El actor perdió el permiso, o la persona dejó de ser miembro, entre el chequeo y la escritura.
    if (result.status === 'PERMISSION_DENIED') {
      throw new PermissionDeniedException();
    }
    if (result.status === 'MEMBER_NOT_FOUND') {
      throw new MemberNotFoundException();
    }
    return toGroupMemberView(result.member);
  }
}
