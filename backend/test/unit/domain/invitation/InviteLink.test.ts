import { describe, it, expect } from 'vitest';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { InviteLink } from '../../../../src/domain/invitation/InviteLink';
import { UserId } from '../../../../src/domain/user/UserId';

describe('InviteLink', () => {
  it('shouldRestoreStoredLinkKeepingItsExpiry', () => {
    const link = InviteLink.restore({
      id: 'lnk_1',
      groupId: GroupId.fromString('grp_casa'),
      codeHash: 'abc123',
      createdBy: UserId.fromString('usr_ana'),
      createdAt: new Date('2026-11-13T12:00:00.000Z'),
      expiresAt: new Date('2026-11-20T12:00:00.000Z'),
    });

    expect(link.codeHash).toBe('abc123');
    expect(link.isValidAt(new Date('2026-11-20T11:59:59.999Z'))).toBe(true);
    expect(link.isValidAt(new Date('2026-11-20T12:00:00.000Z'))).toBe(false);
  });
});
