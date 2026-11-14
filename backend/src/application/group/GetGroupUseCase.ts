import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupNotFoundException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { GroupSummaryView } from './GroupSummaryView';
import { toGroupSummaryView } from './toGroupSummaryView';

/** Un grupo visto por uno de sus miembros activos (docs/api/Groups.md). */
export class GetGroupUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  async execute(command: {
    actor: AuthenticatedActor;
    groupId: string;
  }): Promise<GroupSummaryView> {
    const memberGroup = await this.groupRepository.findForMember(
      GroupId.fromString(command.groupId),
      command.actor.userId,
    );
    if (memberGroup === null) {
      throw new GroupNotFoundException();
    }
    return toGroupSummaryView(memberGroup);
  }
}
