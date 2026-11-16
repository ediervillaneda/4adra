import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupNotFoundException, LastOwnerException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { GroupMemberView, toGroupMemberView } from './toGroupMemberView';

export interface LeaveGroupCommand {
  actor: AuthenticatedActor;
  groupId: string;
}

/** El actor sale del grupo, con cualquier rol, salvo que sea el único Owner (docs/api/Members.md). */
export class LeaveGroupUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: LeaveGroupCommand): Promise<GroupMemberView> {
    // Sin chequeo previo: la misma escritura dice si el actor era miembro activo.
    const groupId = GroupId.fromString(command.groupId);
    const result = await this.groupRepository.leaveGroup(groupId, command.actor.userId, this.now());
    // No era miembro activo: nunca lo fue, ya salió o lo removieron.
    if (result.status === 'NOT_MEMBER') {
      throw new GroupNotFoundException();
    }
    if (result.status === 'LAST_OWNER') {
      throw new LastOwnerException();
    }
    return toGroupMemberView(result.member);
  }
}
