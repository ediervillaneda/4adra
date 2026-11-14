import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { InviteLink } from '../../domain/invitation/InviteLink';
import { InviteLinkRepository } from '../../domain/invitation/InviteLinkRepository';
import { findGroupWhereActorInvites } from '../group/findGroupWhereActorInvites';

export interface CreateInviteLinkCommand {
  actor: AuthenticatedActor;
  groupId: string;
}

/** Enlace recién creado: el único momento en que se entrega el código en claro. */
export interface InviteLinkView {
  groupId: string;
  code: string;
  expiresAt: string;
}

/** Crea el enlace de invitación del grupo y reemplaza el anterior (docs/api/Members.md). */
export class CreateInviteLinkUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly inviteLinkRepository: InviteLinkRepository,
    private readonly generateId: () => string,
    private readonly generateCode: () => string,
    private readonly hashCode: (code: string) => Promise<string>,
    private readonly now: () => Date,
  ) {}

  async execute(command: CreateInviteLinkCommand): Promise<InviteLinkView> {
    const groupId = GroupId.fromString(command.groupId);
    await findGroupWhereActorInvites(this.groupRepository, groupId, command.actor.userId);

    const code = this.generateCode();
    const link = InviteLink.create(
      this.generateId(),
      groupId,
      await this.hashCode(code),
      command.actor.userId,
      this.now(),
    );
    await this.inviteLinkRepository.replaceForGroup(link);
    return { groupId: groupId.toString(), code, expiresAt: link.expiresAt.toISOString() };
  }
}
