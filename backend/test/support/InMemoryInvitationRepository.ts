import { GroupId } from '../../src/domain/group/GroupId';
import { Invitation } from '../../src/domain/invitation/Invitation';
import {
  InvitationRepository,
  ReceivedInvitation,
} from '../../src/domain/invitation/InvitationRepository';
import { InvitationAlreadyRespondedException } from '../../src/domain/invitation/errors';
import { Email } from '../../src/domain/user/Email';
import { UserId } from '../../src/domain/user/UserId';
import { InMemoryGroupRepository } from './InMemoryGroupRepository';
import { InMemoryUserRepository } from './InMemoryUserRepository';

/** Como la D1 (que une `invitations` con `groups` y `users`), toma los nombres de los repositorios dados. */
export class InMemoryInvitationRepository implements InvitationRepository {
  readonly invitations: Invitation[] = [];

  constructor(
    private readonly groups: InMemoryGroupRepository = new InMemoryGroupRepository(),
    private readonly users: InMemoryUserRepository = new InMemoryUserRepository(),
  ) {}

  findPending(groupId: GroupId, email: Email): Promise<Invitation | null> {
    const pending = this.invitations
      .filter(
        (invitation) =>
          invitation.groupId.toString() === groupId.toString() &&
          invitation.email.toString() === email.toString() &&
          invitation.status === 'PENDING',
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return Promise.resolve(pending[0] ?? null);
  }

  async listPendingFor(email: Email): Promise<ReceivedInvitation[]> {
    const received: ReceivedInvitation[] = [];
    for (const invitation of this.invitations) {
      if (invitation.status !== 'PENDING' || !invitation.isAddressedTo(email)) {
        continue;
      }
      const group = this.groups.groupById(invitation.groupId);
      const inviter = await this.users.findById(invitation.invitedBy);
      if (group !== null && inviter !== null) {
        received.push({ invitation, groupName: group.name, invitedByName: inviter.displayName });
      }
    }
    return received;
  }

  findById(invitationId: string): Promise<Invitation | null> {
    return Promise.resolve(
      this.invitations.find((invitation) => invitation.id === invitationId) ?? null,
    );
  }

  save(invitation: Invitation): Promise<void> {
    this.invitations.push(invitation);
    return Promise.resolve();
  }

  saveAccepted(accepted: Invitation, member: UserId): Promise<void> {
    this.replace(accepted);
    this.groups.joinIfAbsent(accepted.groupId, member, accepted.role);
    return Promise.resolve();
  }

  saveDeclined(declined: Invitation): Promise<void> {
    this.replace(declined);
    return Promise.resolve();
  }

  /** Como el `UPDATE … WHERE status = 'PENDING'` de D1: si ya no está pendiente, no la toca. */
  private replace(invitation: Invitation): void {
    const index = this.invitations.findIndex((stored) => stored.id === invitation.id);
    if (this.invitations[index]?.status !== 'PENDING') {
      throw new InvitationAlreadyRespondedException();
    }
    this.invitations[index] = invitation;
  }
}
