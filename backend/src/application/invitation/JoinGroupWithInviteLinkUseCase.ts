import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';
import { InviteLinkRepository } from '../../domain/invitation/InviteLinkRepository';
import { UserRepository } from '../../domain/user/UserRepository';
import { ensureActiveUserProfile } from '../user/ensureActiveUserProfile';
import { findValidInviteLink } from './findValidInviteLink';

export interface JoinGroupWithInviteLinkCommand {
  actor: AuthenticatedActor;
  code: string;
}

/** Membresía del actor después de unirse con el enlace. */
export interface JoinedMembershipView {
  groupId: string;
  userId: string;
  role: MemberRole;
  status: 'ACTIVE';
  joinedAt: string;
}

/** El actor entra como Member al grupo del enlace; si ya era miembro, conserva su rol (docs/api/Members.md). */
export class JoinGroupWithInviteLinkUseCase {
  constructor(
    private readonly inviteLinkRepository: InviteLinkRepository,
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository,
    private readonly hashCode: (code: string) => Promise<string>,
    private readonly now: () => Date,
  ) {}

  async execute(command: JoinGroupWithInviteLinkCommand): Promise<JoinedMembershipView> {
    const now = this.now();
    const { link } = await findValidInviteLink(
      this.inviteLinkRepository,
      this.hashCode,
      command.code,
      now,
    );
    // La membresía exige el perfil; quien llega por el enlace puede no haber pasado por GET /me.
    await ensureActiveUserProfile(this.userRepository, command.actor, now);
    const membership = await this.groupRepository.addMemberIfAbsent(
      link.groupId,
      command.actor.userId,
      'MEMBER',
      now,
    );
    return {
      groupId: link.groupId.toString(),
      userId: command.actor.userId.toString(),
      role: membership.role,
      status: 'ACTIVE',
      joinedAt: membership.joinedAt.toISOString(),
    };
  }
}
