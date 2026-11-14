import { UserId } from '../../domain/user/UserId';
import { GroupNotFoundException, PermissionDeniedException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository, MemberGroup } from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';

const ROLES_THAT_INVITE: readonly MemberRole[] = ['OWNER', 'ADMINISTRATOR'];

/**
 * El grupo, solo si el actor es miembro activo con un rol que invita (Owner o Administrator).
 * Si no es miembro, `GroupNotFoundException`; si su rol no invita, `PermissionDeniedException`.
 */
export async function findGroupWhereActorInvites(
  groupRepository: GroupRepository,
  groupId: GroupId,
  actorId: UserId,
): Promise<MemberGroup> {
  const memberGroup = await groupRepository.findForMember(groupId, actorId);
  if (memberGroup === null) {
    throw new GroupNotFoundException();
  }
  if (!ROLES_THAT_INVITE.includes(memberGroup.role)) {
    throw new PermissionDeniedException();
  }
  return memberGroup;
}
