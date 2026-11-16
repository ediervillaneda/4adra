import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupNotFoundException, PermissionDeniedException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { GroupSummaryView } from './GroupSummaryView';
import { toGroupSummaryView } from './toGroupSummaryView';

export interface ArchiveGroupCommand {
  actor: AuthenticatedActor;
  groupId: string;
}

/**
 * El Owner archiva el grupo, que queda de solo lectura; archivarlo de nuevo responde igual, sin
 * cambios (docs/api/Groups.md).
 */
export class ArchiveGroupUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: ArchiveGroupCommand): Promise<GroupSummaryView> {
    // Sin chequeo previo: la misma escritura dice si el actor es miembro activo y Owner.
    const groupId = GroupId.fromString(command.groupId);
    const result = await this.groupRepository.archive(groupId, command.actor.userId, this.now());
    if (result.status === 'NOT_MEMBER') {
      throw new GroupNotFoundException();
    }
    if (result.status === 'PERMISSION_DENIED') {
      throw new PermissionDeniedException();
    }
    return toGroupSummaryView(result.memberGroup);
  }
}
