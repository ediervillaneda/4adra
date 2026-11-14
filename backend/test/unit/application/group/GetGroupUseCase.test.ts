import { describe, it, expect } from 'vitest';
import { GetGroupUseCase } from '../../../../src/application/group/GetGroupUseCase';
import { Group } from '../../../../src/domain/group/Group';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { AuthenticatedActor } from '../../../../src/domain/auth/AuthenticatedActor';
import { InMemoryGroupRepository } from '../../../support/InMemoryGroupRepository';

const CREATED = new Date('2026-11-12T15:00:00.000Z');
const actor: AuthenticatedActor = {
  userId: UserId.fromString('usr_ana'),
  email: Email.fromString('ana@example.com'),
  displayName: 'Ana Pérez',
  photoUrl: null,
};

describe('GetGroupUseCase', () => {
  it('shouldReturnGroupForActiveMember', async () => {
    const groups = new InMemoryGroupRepository();
    const casa = Group.create(
      GroupId.fromString('grp_casa'),
      { name: 'Casa', description: 'Arriendo', defaultCurrency: 'COP' },
      UserId.fromString('usr_klara'),
      CREATED,
    );
    groups.seedMembership(casa, {
      groupId: 'grp_casa',
      userId: 'usr_ana',
      role: 'MEMBER',
      status: 'ACTIVE',
    });

    const view = await new GetGroupUseCase(groups).execute({ actor, groupId: 'grp_casa' });

    expect(view).toMatchObject({
      id: 'grp_casa',
      name: 'Casa',
      description: 'Arriendo',
      defaultCurrency: 'COP',
      role: 'MEMBER',
    });
  });

  it('shouldThrowGroupNotFoundWhenActorIsNotActiveMember', async () => {
    const groups = new InMemoryGroupRepository();
    const ajeno = Group.create(
      GroupId.fromString('grp_ajeno'),
      { name: 'Ajeno', description: null, defaultCurrency: 'COP' },
      UserId.fromString('usr_klara'),
      CREATED,
    );
    groups.seedMembership(ajeno, {
      groupId: 'grp_ajeno',
      userId: 'usr_ana',
      role: 'MEMBER',
      status: 'REMOVED',
    });
    const useCase = new GetGroupUseCase(groups);

    for (const groupId of ['grp_ajeno', 'grp_no_existe']) {
      await expect(useCase.execute({ actor, groupId })).rejects.toMatchObject({
        code: 'GROUP_NOT_FOUND',
        message: 'Grupo no encontrado.',
      });
    }
  });
});
