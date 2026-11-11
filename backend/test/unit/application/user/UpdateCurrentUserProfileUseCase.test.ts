import { describe, it, expect } from 'vitest';
import { UpdateCurrentUserProfileUseCase } from '../../../../src/application/user/UpdateCurrentUserProfileUseCase';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { UserDisabledException } from '../../../../src/domain/user/errors';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';
import { AuthenticatedActor } from '../../../../src/domain/auth/AuthenticatedActor';
import { InMemoryUserRepository } from '../../../support/InMemoryUserRepository';

const NOW = new Date('2026-11-11T18:00:00.000Z');
const actor: AuthenticatedActor = {
  userId: UserId.fromString('usr_ana'),
  email: Email.fromString('ana@example.com'),
  displayName: 'Ana Pérez',
  photoUrl: null,
};

function existingUser(status: 'ACTIVE' | 'DISABLED' = 'ACTIVE'): User {
  const timestamp = new Date('2026-07-13T12:00:00.000Z');
  return User.create({
    id: UserId.fromString('usr_ana'),
    displayName: 'Ana Pérez',
    email: Email.fromString('ana@example.com'),
    photoUrl: null,
    preferredCurrency: 'USD',
    language: 'es',
    timeZone: 'UTC',
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

describe('UpdateCurrentUserProfileUseCase', () => {
  it('shouldApplyValidChangesPersistAndReturnProfile', async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(existingUser());
    const useCase = new UpdateCurrentUserProfileUseCase(repository, () => NOW);

    const view = await useCase.execute({
      actor,
      changes: { preferredCurrency: 'COP', timeZone: 'America/Bogota' },
    });

    expect(view).toMatchObject({
      id: 'usr_ana',
      preferredCurrency: 'COP',
      timeZone: 'America/Bogota',
      createdAt: '2026-07-13T12:00:00.000Z',
      updatedAt: '2026-11-11T18:00:00.000Z',
    });
    expect((await repository.findById(actor.userId))?.preferredCurrency).toBe('COP');
  });

  it('shouldCreateProfileWithDefaultsWhenMissingThenApplyChanges', async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new UpdateCurrentUserProfileUseCase(repository, () => NOW);

    const view = await useCase.execute({ actor, changes: { language: 'en' } });

    expect(view).toMatchObject({
      language: 'en',
      preferredCurrency: 'COP',
      timeZone: 'America/Bogota',
    });
  });

  it('shouldRejectDisabledUserWithoutSaving', async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(existingUser('DISABLED'));
    const useCase = new UpdateCurrentUserProfileUseCase(repository, () => NOW);

    await expect(useCase.execute({ actor, changes: { language: 'en' } })).rejects.toBeInstanceOf(
      UserDisabledException,
    );
    expect(repository.saveCount).toBe(0);
  });

  it('shouldRejectInvalidChangesWithoutSaving', async () => {
    const repository = new InMemoryUserRepository();
    repository.seed(existingUser());
    const useCase = new UpdateCurrentUserProfileUseCase(repository, () => NOW);

    await expect(
      useCase.execute({ actor, changes: { language: 'fr', email: 'otro@example.com' } }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(repository.saveCount).toBe(0);
  });
});
