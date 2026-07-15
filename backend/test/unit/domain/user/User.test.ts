import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { UserDisabledException } from '../../../../src/domain/user/errors';

function validProps(
  overrides: Partial<Parameters<typeof User.create>[0]> = {},
): Parameters<typeof User.create>[0] {
  const timestamp = new Date('2026-07-13T12:00:00Z');
  return {
    id: UserId.fromString('usr_ana'),
    displayName: 'Ana Pérez',
    email: Email.fromString('ana@example.com'),
    photoUrl: null,
    preferredCurrency: 'USD',
    language: 'es',
    timeZone: 'UTC',
    status: 'ACTIVE' as const,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe('User', () => {
  it('shouldCreateWithValidProps', () => {
    const user = User.create(validProps());
    expect(user.displayName).toBe('Ana Pérez');
    expect(user.email.toString()).toBe('ana@example.com');
    expect(user.status).toBe('ACTIVE');
  });

  it('shouldRejectEmptyDisplayName', () => {
    expect(() => User.create(validProps({ displayName: '   ' }))).toThrow(
      'displayName no puede estar vacío.',
    );
  });

  it('shouldNotThrowWhenActiveUserAssertsActive', () => {
    const user = User.create(validProps({ status: 'ACTIVE' }));
    expect(() => user.assertActive()).not.toThrow();
  });

  it('shouldThrowUserDisabledExceptionWhenDisabledUserAssertsActive', () => {
    const user = User.create(validProps({ status: 'DISABLED' }));
    expect(() => user.assertActive()).toThrow(UserDisabledException);
  });
});
