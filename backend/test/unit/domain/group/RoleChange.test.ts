import { describe, it, expect } from 'vitest';
import { validateRoleChange } from '../../../../src/domain/group/RoleChange';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';

function failureOf(input: unknown): ValidationException {
  try {
    validateRoleChange(input);
  } catch (error) {
    if (error instanceof ValidationException) return error;
    throw error;
  }
  throw new Error('se esperaba ValidationException');
}

describe('validateRoleChange', () => {
  it('shouldAcceptEachMemberRole', () => {
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      expect(validateRoleChange({ role })).toBe(role);
    }
  });

  it('shouldRejectUnsupportedRole', () => {
    for (const role of ['owner', 'ADMIN', 42, undefined, null]) {
      expect(failureOf({ role }).details).toEqual([{ field: 'role', reason: 'unsupported_role' }]);
    }
  });

  it('shouldRejectNonObjectBody', () => {
    for (const input of [null, 'OWNER', ['OWNER']]) {
      expect(failureOf(input).details).toEqual([{ field: 'body', reason: 'must_be_object' }]);
    }
  });
});
