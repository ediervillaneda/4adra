import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { GroupSummaryView } from './GroupSummaryView';
import { toGroupSummaryView } from './toGroupSummaryView';

/** Grupos donde el actor tiene una membresía activa, con su rol (docs/api/Groups.md). */
export class ListMyGroupsUseCase {
  constructor(private readonly groupRepository: GroupRepository) {}

  async execute(command: { actor: AuthenticatedActor }): Promise<GroupSummaryView[]> {
    const memberGroups = await this.groupRepository.listForMember(command.actor.userId);
    return memberGroups.map(toGroupSummaryView);
  }
}
