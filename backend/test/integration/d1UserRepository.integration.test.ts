import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { D1UserRepository } from '../../src/infrastructure/d1/D1UserRepository';
import { User } from '../../src/domain/user/User';
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';
import { UserStatus } from '../../src/domain/user/UserStatus';
import { seedAuthUser } from './seedAuthUser';

function anaUser(id = 'usr_ana', status: UserStatus = 'ACTIVE'): User {
  return User.create({
    id: UserId.fromString(id),
    displayName: 'Ana Pérez',
    email: Email.fromString('ana@example.com'),
    photoUrl: null,
    preferredCurrency: 'COP',
    language: 'es',
    timeZone: 'America/Bogota',
    status,
    createdAt: new Date('2026-07-13T12:00:00.000Z'),
    updatedAt: new Date('2026-07-14T08:30:00.000Z'),
  });
}

describe('D1UserRepository (integración con D1 local)', () => {
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM "user"').run();
    await seedAuthUser('usr_ana', 'ana@example.com');
  });

  it('shouldReturnNullWhenUserDoesNotExist', async () => {
    const repository = new D1UserRepository(env.DB);

    expect(await repository.findById(UserId.fromString('usr_ana'))).toBeNull();
  });

  it('shouldRoundTripAllUserFields', async () => {
    const repository = new D1UserRepository(env.DB);

    await repository.save(anaUser());
    const found = await repository.findById(UserId.fromString('usr_ana'));

    expect(found).not.toBeNull();
    expect(found?.id.toString()).toBe('usr_ana');
    expect(found?.displayName).toBe('Ana Pérez');
    expect(found?.email.toString()).toBe('ana@example.com');
    expect(found?.photoUrl).toBeNull();
    expect(found?.preferredCurrency).toBe('COP');
    expect(found?.language).toBe('es');
    expect(found?.timeZone).toBe('America/Bogota');
    expect(found?.status).toBe('ACTIVE');
    expect(found?.createdAt.toISOString()).toBe('2026-07-13T12:00:00.000Z');
    expect(found?.updatedAt.toISOString()).toBe('2026-07-14T08:30:00.000Z');
  });

  it('shouldUpdateExistingUserOnSecondSave', async () => {
    const repository = new D1UserRepository(env.DB);

    await repository.save(anaUser());
    await repository.save(anaUser('usr_ana', 'DISABLED'));
    const found = await repository.findById(UserId.fromString('usr_ana'));
    const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{
      total: number;
    }>();

    expect(found?.status).toBe('DISABLED');
    expect(count?.total).toBe(1);
  });

  it('shouldRejectProfileWithoutAuthUser', async () => {
    const repository = new D1UserRepository(env.DB);

    await expect(repository.save(anaUser('usr_ghost'))).rejects.toThrow();
  });
});
