import { GetCurrentUserProfileUseCase } from '../../../../src/application/user/GetCurrentUserProfileUseCase';
import { UserRepository } from '../../../../src/domain/user/UserRepository';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { UserDisabledException } from '../../../../src/domain/user/errors';
import { AuthenticatedActor } from '../../../../src/domain/auth/AuthenticatedActor';

class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();

  seed(user: User): void {
    this.usersById.set(user.id.toString(), user);
  }

  findById(id: UserId): Promise<User | null> {
    return Promise.resolve(this.usersById.get(id.toString()) ?? null);
  }

  save(user: User): Promise<void> {
    this.usersById.set(user.id.toString(), user);
    return Promise.resolve();
  }
}

function anActor(overrides: Partial<AuthenticatedActor> = {}): AuthenticatedActor {
  return {
    userId: UserId.fromString('usr_ana'),
    email: Email.fromString('ana@example.com'),
    displayName: 'Ana Pérez',
    photoUrl: null,
    ...overrides,
  };
}

describe('GetCurrentUserProfileUseCase', () => {
  it('shouldReturnExistingActiveProfileWithoutCreatingANewOne', async () => {
    const repository = new InMemoryUserRepository();
    const timestamp = new Date('2026-01-01T00:00:00Z');
    const existing = User.create({
      id: UserId.fromString('usr_ana'),
      displayName: 'Ana Existente',
      email: Email.fromString('ana@example.com'),
      photoUrl: null,
      preferredCurrency: 'COP',
      language: 'es',
      timeZone: 'America/Bogota',
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    repository.seed(existing);
    const saveSpy = jest.spyOn(repository, 'save');
    const useCase = new GetCurrentUserProfileUseCase(
      repository,
      () => new Date('2026-07-13T00:00:00Z'),
    );

    const result = await useCase.execute({ actor: anActor() });

    expect(result.displayName).toBe('Ana Existente');
    expect(result.preferredCurrency).toBe('COP');
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('shouldCreateProfileWithDefaultsWhenNoneExists', async () => {
    const repository = new InMemoryUserRepository();
    const now = new Date('2026-07-13T12:00:00Z');
    const useCase = new GetCurrentUserProfileUseCase(repository, () => now);

    const result = await useCase.execute({ actor: anActor() });

    expect(result).toEqual({
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
    const persisted = await repository.findById(UserId.fromString('usr_ana'));
    expect(persisted).not.toBeNull();
  });

  it('shouldFallBackToEmailAsDisplayNameWhenActorHasNone', async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new GetCurrentUserProfileUseCase(
      repository,
      () => new Date('2026-07-13T00:00:00Z'),
    );

    const result = await useCase.execute({ actor: anActor({ displayName: null }) });

    expect(result.displayName).toBe('ana@example.com');
  });

  it('shouldRejectWhenExistingUserIsDisabled', async () => {
    const repository = new InMemoryUserRepository();
    const timestamp = new Date('2026-01-01T00:00:00Z');
    const disabled = User.create({
      id: UserId.fromString('usr_ana'),
      displayName: 'Ana Pérez',
      email: Email.fromString('ana@example.com'),
      photoUrl: null,
      preferredCurrency: 'USD',
      language: 'es',
      timeZone: 'UTC',
      status: 'DISABLED',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    repository.seed(disabled);
    const useCase = new GetCurrentUserProfileUseCase(repository, () => new Date());

    await expect(useCase.execute({ actor: anActor() })).rejects.toThrow(UserDisabledException);
  });
});
