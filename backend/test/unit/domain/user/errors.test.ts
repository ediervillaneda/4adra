import { UserDisabledException } from '../../../../src/domain/user/errors';
import { DomainError } from '../../../../src/domain/errors/DomainError';

describe('UserDisabledException', () => {
  it('shouldExposeUserDisabledCode', () => {
    const error = new UserDisabledException('usr_ana');
    expect(error.code).toBe('USER_DISABLED');
  });

  it('shouldIncludeUserIdInMessage', () => {
    const error = new UserDisabledException('usr_ana');
    expect(error.message).toContain('usr_ana');
  });

  it('shouldBeInstanceOfDomainError', () => {
    const error = new UserDisabledException('usr_ana');
    expect(error).toBeInstanceOf(DomainError);
  });
});
