import { GroupMember } from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';

/** Una membresía tal como la entrega la API (sin correo, docs/api/Members.md). */
export interface GroupMemberView {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: MemberRole;
  status: 'ACTIVE' | 'REMOVED';
  joinedAt: string;
}

export function toGroupMemberView(member: GroupMember): GroupMemberView {
  return {
    userId: member.userId.toString(),
    displayName: member.displayName,
    photoUrl: member.photoUrl,
    role: member.role,
    status: member.status,
    joinedAt: member.joinedAt.toISOString(),
  };
}
