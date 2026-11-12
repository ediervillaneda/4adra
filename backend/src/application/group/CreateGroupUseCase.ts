import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { Group } from '../../domain/group/Group';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { validateNewGroup } from '../../domain/group/NewGroup';
import { UserRepository } from '../../domain/user/UserRepository';
import { createUserFromActor } from '../user/createUserFromActor';
import { GroupSummaryView } from './GroupSummaryView';
import { toGroupSummaryView } from './toGroupSummaryView';

export interface CreateGroupCommand {
  actor: AuthenticatedActor;
  /** Carga no confiable (cuerpo JSON); se valida con validateNewGroup. */
  input: unknown;
}

/** Crea un grupo y deja a quien lo crea como su Owner (docs/api/Groups.md). */
export class CreateGroupUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async execute(command: CreateGroupCommand): Promise<GroupSummaryView> {
    const data = validateNewGroup(command.input);
    const now = this.now();
    const creator =
      (await this.userRepository.findById(command.actor.userId)) ??
      createUserFromActor(command.actor, now);
    creator.assertActive();
    await this.userRepository.save(creator);

    const group = Group.create(GroupId.fromString(this.generateId()), data, creator.id, now);
    await this.groupRepository.createWithOwner(group);
    return toGroupSummaryView({ group, role: 'OWNER' });
  }
}
