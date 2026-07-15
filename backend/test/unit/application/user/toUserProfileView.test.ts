import { toUserProfileView } from '../../../../src/application/user/toUserProfileView';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';

describe('toUserProfileView', () => {
  it('shouldMapUserEntityToPlainView', () => {
    const timestamp = new Date('2026-07-13T12:00:00Z');
    const user = User.create({
      id: UserId.fromString('usr_ana'),
      displayName: 'Ana Pérez',
      email: Email.fromString('ana@example.com'),
      photoUrl: null,
      preferredCurrency: 'USD',
      language: 'es',
      timeZone: 'UTC',
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(toUserProfileView(user)).toEqual({
      id: 'usr_ana',
      displayName: 'Ana Pérez',
      email: 'ana@example.com',
      photoUrl: null,
      preferredCurrency: 'USD',
      language: 'es',
      timeZone: 'UTC',
      status: 'ACTIVE',
      createdAt: '2026-07-13T12:00:00.000Z',
      updatedAt: '2026-07-13T12:00:00.000Z',
    });
  });
});
