import { describe, it, expect } from 'vitest';
import { ListGroupMembersUseCase } from '../../../../src/application/group/ListGroupMembersUseCase';
import { Group } from '../../../../src/domain/group/Group';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { MemberRole } from '../../../../src/domain/group/MemberRole';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';
import { AuthenticatedActor } from '../../../../src/domain/auth/AuthenticatedActor';
import { InMemoryGroupRepository } from '../../../support/InMemoryGroupRepository';
import { InMemoryUserRepository } from '../../../support/InMemoryUserRepository';

const CREATED = new Date('2026-11-12T15:00:00.000Z');
const actor: AuthenticatedActor = {
  userId: UserId.fromString('usr_zoe'),
  email: Email.fromString('zoe@example.com'),
  displayName: 'Zoe',
  photoUrl: null,
};

function userOf(id: string, displayName: string): User {
  return User.create({
    id: UserId.fromString(id),
    displayName,
    email: Email.fromString(`${id}@example.com`),
    photoUrl: null,
    preferredCurrency: 'COP',
    language: 'es',
    timeZone: 'America/Bogota',
    status: 'ACTIVE',
    createdAt: CREATED,
    updatedAt: CREATED,
  });
}

function casaWith(
  users: InMemoryUserRepository,
  members: [id: string, name: string, role: MemberRole, status: 'ACTIVE' | 'REMOVED'][],
): InMemoryGroupRepository {
  const groups = new InMemoryGroupRepository(users);
  const casa = Group.create(
    GroupId.fromString('grp_casa'),
    { name: 'Casa', description: null, defaultCurrency: 'COP' },
    UserId.fromString('usr_zoe'),
    CREATED,
  );
  for (const [id, name, role, status] of members) {
    users.seed(userOf(id, name));
    groups.seedMembership(casa, { groupId: 'grp_casa', userId: id, role, status });
  }
  return groups;
}

describe('ListGroupMembersUseCase', () => {
  it('shouldReturnActiveMembersSortedByName', async () => {
    const groups = casaWith(new InMemoryUserRepository(), [
      ['usr_zoe', 'Zoe', 'OWNER', 'ACTIVE'],
      ['usr_ana_2', 'Ana', 'MEMBER', 'ACTIVE'],
      ['usr_alvaro', 'Álvaro', 'ADMINISTRATOR', 'ACTIVE'],
      ['usr_ana_1', 'ana', 'READ_ONLY', 'ACTIVE'],
      ['usr_ido', 'Ido', 'MEMBER', 'REMOVED'],
    ]);

    const views = await new ListGroupMembersUseCase(groups).execute({
      actor,
      groupId: 'grp_casa',
    });

    expect(views.map((view) => [view.userId, view.displayName, view.role])).toEqual([
      ['usr_alvaro', 'Álvaro', 'ADMINISTRATOR'],
      ['usr_ana_1', 'ana', 'READ_ONLY'],
      ['usr_ana_2', 'Ana', 'MEMBER'],
      ['usr_zoe', 'Zoe', 'OWNER'],
    ]);
  });

  it('shouldThrowGroupNotFoundWhenActorIsNotActiveMember', async () => {
    const groups = casaWith(new InMemoryUserRepository(), [
      ['usr_klara', 'Klara', 'OWNER', 'ACTIVE'],
      ['usr_zoe', 'Zoe', 'MEMBER', 'REMOVED'],
    ]);
    const useCase = new ListGroupMembersUseCase(groups);

    for (const groupId of ['grp_casa', 'grp_no_existe']) {
      await expect(useCase.execute({ actor, groupId })).rejects.toMatchObject({
        code: 'GROUP_NOT_FOUND',
      });
    }
  });
});
