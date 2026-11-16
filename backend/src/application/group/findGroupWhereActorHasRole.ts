import { UserId } from '../../domain/user/UserId';
import { GroupNotFoundException, PermissionDeniedException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository, MemberGroup } from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';

/**
 * El grupo, solo si el actor es miembro activo con uno de los roles permitidos (matriz en docs/Security.md).
 * Si no es miembro, `GroupNotFoundException`; si el grupo está archivado, `GroupArchivedException`
 * (antes que el rol: quien igual no podía cambiarlo también ve que es de solo lectura); si su rol no
 * está permitido, `PermissionDeniedException`.
 */
export async function findGroupWhereActorHasRole(
  groupRepository: GroupRepository,
  groupId: GroupId,
  actorId: UserId,
  allowedRoles: readonly MemberRole[],
): Promise<MemberGroup> {
  const memberGroup = await groupRepository.findForMember(groupId, actorId);
  if (memberGroup === null) {
    throw new GroupNotFoundException();
  }
  memberGroup.group.ensureActive();
  if (!allowedRoles.includes(memberGroup.role)) {
    throw new PermissionDeniedException();
  }
  return memberGroup;
}
