import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { AllowedEmailRepository } from '../../domain/access/AllowedEmailRepository';
import { GroupNotFoundException, PermissionDeniedException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';
import { Invitation } from '../../domain/invitation/Invitation';
import { InvitationRepository } from '../../domain/invitation/InvitationRepository';
import {
  EmailNotAllowedException,
  MemberAlreadyActiveException,
} from '../../domain/invitation/errors';
import { validateNewInvitation } from '../../domain/invitation/NewInvitation';
import { InvitationView } from './InvitationView';
import { toInvitationView } from './toInvitationView';

export interface InviteMemberCommand {
  actor: AuthenticatedActor;
  groupId: string;
  /** Carga no confiable (cuerpo JSON). */
  input: unknown;
}

const ROLES_THAT_INVITE: readonly MemberRole[] = ['OWNER', 'ADMINISTRATOR'];

/** Invita un correo a un grupo; si ya tiene una invitación pendiente, devuelve esa (docs/api/Members.md). */
export class InviteMemberUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly allowedEmailRepository: AllowedEmailRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly generateId: () => string,
    private readonly now: () => Date,
  ) {}

  async execute(command: InviteMemberCommand): Promise<InvitationView> {
    const { email, role } = validateNewInvitation(command.input);
    const groupId = GroupId.fromString(command.groupId);

    const memberGroup = await this.groupRepository.findForMember(groupId, command.actor.userId);
    if (memberGroup === null) {
      throw new GroupNotFoundException();
    }
    if (!ROLES_THAT_INVITE.includes(memberGroup.role)) {
      throw new PermissionDeniedException();
    }
    if (!(await this.allowedEmailRepository.isAllowed(email))) {
      throw new EmailNotAllowedException();
    }
    if (await this.groupRepository.hasActiveMemberWithEmail(groupId, email)) {
      throw new MemberAlreadyActiveException();
    }

    const now = this.now();
    const pending = await this.invitationRepository.findPending(groupId, email);
    if (pending?.isPendingAt(now) === true) {
      return toInvitationView(pending);
    }

    const invitation = Invitation.create(
      this.generateId(),
      groupId,
      email,
      role,
      command.actor.userId,
      now,
    );
    await this.invitationRepository.save(invitation);
    return toInvitationView(invitation);
  }
}
