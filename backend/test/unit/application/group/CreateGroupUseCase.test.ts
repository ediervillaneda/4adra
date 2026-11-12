import { describe, it, expect } from 'vitest';
import { CreateGroupUseCase } from '../../../../src/application/group/CreateGroupUseCase';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { AuthenticatedActor } from '../../../../src/domain/auth/AuthenticatedActor';
import { InMemoryUserRepository } from '../../../support/InMemoryUserRepository';
import { InMemoryGroupRepository } from '../../../support/InMemoryGroupRepository';

const NOW = new Date('2026-11-12T15:00:00.000Z');
const actor: AuthenticatedActor = {
  userId: UserId.fromString('usr_ana'),
  email: Email.fromString('ana@example.com'),
  displayName: 'Ana Pérez',
  photoUrl: null,
};

describe('CreateGroupUseCase', () => {
  it('createGroupShouldMakeCreatorOwner', async () => {
    const groups = new InMemoryGroupRepository();
    const users = new InMemoryUserRepository();
    const useCase = new CreateGroupUseCase(
      groups,
      users,
      () => 'grp_1',
      () => NOW,
    );

    const view = await useCase.execute({
      actor,
      input: { name: ' Viaje Guatemala ', defaultCurrency: 'USD' },
    });

    expect(view).toEqual({
      id: 'grp_1',
      name: 'Viaje Guatemala',
      description: null,
      defaultCurrency: 'USD',
      status: 'ACTIVE',
      role: 'OWNER',
      createdAt: '2026-11-12T15:00:00.000Z',
      updatedAt: '2026-11-12T15:00:00.000Z',
    });
    const listed = await groups.listForMember(actor.userId);
    expect(listed.map((entry) => [entry.group.id.toString(), entry.role])).toEqual([
      ['grp_1', 'OWNER'],
    ]);
    expect(await users.findById(actor.userId)).not.toBeNull();
  });
});
