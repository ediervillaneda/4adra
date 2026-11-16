import { describe, it, expect } from 'vitest';
import { canRemove } from '../../../../src/domain/group/canRemove';
import { MemberRole } from '../../../../src/domain/group/MemberRole';

const ROLES: MemberRole[] = ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY'];

function removableBy(actorRole: MemberRole): MemberRole[] {
  return ROLES.filter((targetRole) => canRemove(actorRole, targetRole));
}

describe('canRemove', () => {
  it('shouldLetOwnerRemoveAnyRole', () => {
    expect(removableBy('OWNER')).toEqual(['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']);
  });

  it('shouldLetAdministratorRemoveOnlyMemberAndReadOnly', () => {
    expect(removableBy('ADMINISTRATOR')).toEqual(['MEMBER', 'READ_ONLY']);
  });

  it('shouldNotLetMemberOrReadOnlyRemoveAnyone', () => {
    expect(removableBy('MEMBER')).toEqual([]);
    expect(removableBy('READ_ONLY')).toEqual([]);
  });
});
