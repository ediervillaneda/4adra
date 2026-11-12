import { describe, it, expect } from 'vitest';
import { Invitation } from '../../../../src/domain/invitation/Invitation';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { Email } from '../../../../src/domain/user/Email';
import { UserId } from '../../../../src/domain/user/UserId';

describe('Invitation', () => {
  it('shouldRestoreInvitationAndTreatNonPendingStatusAsNotPending', () => {
    const properties = {
      id: 'inv_1',
      groupId: GroupId.fromString('grp_casa'),
      email: Email.fromString('juan@example.com'),
      role: 'MEMBER' as const,
      invitedBy: UserId.fromString('usr_ana'),
      createdAt: new Date('2026-11-12T15:00:00.000Z'),
      expiresAt: new Date('2026-11-19T15:00:00.000Z'),
    };
    const beforeExpiry = new Date('2026-11-13T15:00:00.000Z');

    const pending = Invitation.restore({ ...properties, status: 'PENDING' });
    const accepted = Invitation.restore({ ...properties, status: 'ACCEPTED' });

    expect(pending.id).toBe('inv_1');
    expect(pending.isPendingAt(beforeExpiry)).toBe(true);
    expect(accepted.isPendingAt(beforeExpiry)).toBe(false);
  });
});
