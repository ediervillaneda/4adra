import { GroupId } from '../../src/domain/group/GroupId';
import { Invitation } from '../../src/domain/invitation/Invitation';
import { InvitationRepository } from '../../src/domain/invitation/InvitationRepository';
import { Email } from '../../src/domain/user/Email';

export class InMemoryInvitationRepository implements InvitationRepository {
  readonly invitations: Invitation[] = [];

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

  save(invitation: Invitation): Promise<void> {
    this.invitations.push(invitation);
    return Promise.resolve();
  }
}
