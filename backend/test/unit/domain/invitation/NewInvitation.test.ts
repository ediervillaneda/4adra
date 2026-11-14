import { describe, it, expect } from 'vitest';
import { validateNewInvitation } from '../../../../src/domain/invitation/NewInvitation';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';

function failureOf(input: unknown): ValidationException {
  try {
    validateNewInvitation(input);
  } catch (error) {
    if (error instanceof ValidationException) return error;
    throw error;
  }
  throw new Error('se esperaba ValidationException');
}

describe('validateNewInvitation', () => {
  it('shouldRejectNonObjectBody', () => {
    for (const input of [null, 'juan@example.com', ['juan@example.com']]) {
      expect(failureOf(input).details).toEqual([{ field: 'body', reason: 'must_be_object' }]);
    }
  });

  it('shouldRejectNonStringOrInvalidEmail', () => {
    for (const email of [42, undefined, 'juan@', 'sin arroba.com']) {
      expect(failureOf({ email, role: 'MEMBER' }).details).toEqual([
        { field: 'email', reason: 'invalid_email' },
      ]);
    }
  });

  it('shouldNormalizeEmailAndAcceptEachInvitableRole', () => {
    for (const role of ['ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      const invitation = validateNewInvitation({ email: '  Juan@Example.COM ', role });

      expect(invitation.email.toString()).toBe('juan@example.com');
      expect(invitation.role).toBe(role);
    }
    expect(failureOf({ email: 'juan@example.com', role: 'owner' }).details).toEqual([
      { field: 'role', reason: 'unsupported_role' },
    ]);
  });
});
