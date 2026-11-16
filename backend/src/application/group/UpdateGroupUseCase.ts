import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupNotFoundException, PermissionDeniedException } from '../../domain/group/errors';
import { validateGroupChanges } from '../../domain/group/GroupChanges';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { ROLES_THAT_EDIT_GROUP } from '../../domain/group/MemberRole';
import { findGroupWhereActorHasRole } from './findGroupWhereActorHasRole';
import { GroupSummaryView } from './GroupSummaryView';
import { toGroupSummaryView } from './toGroupSummaryView';

export interface UpdateGroupCommand {
  actor: AuthenticatedActor;
  groupId: string;
  /** Carga no confiable (cuerpo JSON). */
  input: unknown;
}

/** Owner o Administrator editan el nombre y la descripción del grupo (docs/api/Groups.md). */
export class UpdateGroupUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: UpdateGroupCommand): Promise<GroupSummaryView> {
    const groupId = GroupId.fromString(command.groupId);
    // Primero el permiso: quien no puede editar recibe 404/403 aunque el cuerpo sea inválido.
    await findGroupWhereActorHasRole(
      this.groupRepository,
      groupId,
      command.actor.userId,
      ROLES_THAT_EDIT_GROUP,
    );
    const changes = validateGroupChanges(command.input);

    const result = await this.groupRepository.updateDetails(
      groupId,
      command.actor.userId,
      changes,
      this.now(),
    );
    // El actor dejó de poder editar, o de ser miembro, entre el chequeo y la escritura.
    if (result.status === 'PERMISSION_DENIED') {
      throw new PermissionDeniedException();
    }
    if (result.status === 'NOT_MEMBER') {
      throw new GroupNotFoundException();
    }
    return toGroupSummaryView(result.memberGroup);
  }
}
