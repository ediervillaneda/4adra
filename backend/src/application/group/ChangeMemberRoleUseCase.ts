import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import {
  LastOwnerException,
  MemberNotFoundException,
  PermissionDeniedException,
} from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { ROLES_THAT_CHANGE_ROLES } from '../../domain/group/MemberRole';
import { validateRoleChange } from '../../domain/group/RoleChange';
import { UserId } from '../../domain/user/UserId';
import { findGroupWhereActorHasRole } from './findGroupWhereActorHasRole';
import { GroupMemberView, toGroupMemberView } from './toGroupMemberView';

export interface ChangeMemberRoleCommand {
  actor: AuthenticatedActor;
  groupId: string;
  userId: string;
  /** Carga no confiable (cuerpo JSON). */
  input: unknown;
}

/** Un `userId` que ni siquiera es válido tampoco es miembro del grupo. */
function toMemberId(value: string): UserId {
  try {
    return UserId.fromString(value);
  } catch {
    throw new MemberNotFoundException();
  }
}

/** Un Owner cambia el rol de un miembro activo; el grupo conserva al menos un Owner (docs/api/Members.md). */
export class ChangeMemberRoleUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: ChangeMemberRoleCommand): Promise<GroupMemberView> {
    const role = validateRoleChange(command.input);
    const groupId = GroupId.fromString(command.groupId);
    await findGroupWhereActorHasRole(
      this.groupRepository,
      groupId,
      command.actor.userId,
      ROLES_THAT_CHANGE_ROLES,
    );

    const result = await this.groupRepository.changeMemberRole(
      groupId,
      command.actor.userId,
      toMemberId(command.userId),
      role,
      this.now(),
    );
    // El actor dejó de ser Owner entre el chequeo y la escritura.
    if (result.status === 'PERMISSION_DENIED') {
      throw new PermissionDeniedException();
    }
    if (result.status === 'MEMBER_NOT_FOUND') {
      throw new MemberNotFoundException();
    }
    if (result.status === 'LAST_OWNER') {
      throw new LastOwnerException();
    }
    return toGroupMemberView(result.member);
  }
}
