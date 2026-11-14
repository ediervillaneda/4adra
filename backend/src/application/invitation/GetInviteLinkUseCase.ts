import { InviteLinkRepository } from '../../domain/invitation/InviteLinkRepository';
import { findValidInviteLink } from './findValidInviteLink';

export interface GetInviteLinkCommand {
  code: string;
}

/** A qué grupo invita un enlace vigente, sin miembros, moneda ni descripción. */
export interface InviteLinkPreviewView {
  groupId: string;
  groupName: string;
  expiresAt: string;
}

/** Muestra a qué grupo invita un enlace vigente (docs/api/Members.md). */
export class GetInviteLinkUseCase {
  constructor(
    private readonly inviteLinkRepository: InviteLinkRepository,
    private readonly hashCode: (code: string) => Promise<string>,
    private readonly now: () => Date,
  ) {}

  async execute(command: GetInviteLinkCommand): Promise<InviteLinkPreviewView> {
    const { link, groupName } = await findValidInviteLink(
      this.inviteLinkRepository,
      this.hashCode,
      command.code,
      this.now(),
    );
    return {
      groupId: link.groupId.toString(),
      groupName,
      expiresAt: link.expiresAt.toISOString(),
    };
  }
}
