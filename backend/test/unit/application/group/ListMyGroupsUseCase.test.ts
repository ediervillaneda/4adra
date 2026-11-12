import { describe, it, expect } from 'vitest';
import { ListMyGroupsUseCase } from '../../../../src/application/group/ListMyGroupsUseCase';
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

function groupOf(id: string, name: string, createdBy: string): Group {
  return Group.create(
    GroupId.fromString(id),
    { name, description: null, defaultCurrency: 'COP' },
    UserId.fromString(createdBy),
    CREATED,
  );
}

describe('ListMyGroupsUseCase', () => {
  it('listMyGroupsShouldReturnOnlyGroupsWhereActorIsActiveMember', async () => {
    const groups = new InMemoryGroupRepository();
    const casa = groupOf('grp_casa', 'Casa', 'usr_ana');
    const viaje = groupOf('grp_viaje', 'Viaje', 'usr_klara');
    const oficina = groupOf('grp_oficina', 'Oficina', 'usr_klara');
    const ajeno = groupOf('grp_ajeno', 'Ajeno', 'usr_klara');
    groups.seedMembership(casa, {
      groupId: 'grp_casa',
      userId: 'usr_ana',
      role: 'OWNER',
      status: 'ACTIVE',
    });
    groups.seedMembership(viaje, {
      groupId: 'grp_viaje',
      userId: 'usr_ana',
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    groups.seedMembership(oficina, {
      groupId: 'grp_oficina',
      userId: 'usr_ana',
      role: 'MEMBER',
      status: 'REMOVED',
    });
    groups.seedMembership(ajeno, {
      groupId: 'grp_ajeno',
      userId: 'usr_klara',
      role: 'OWNER',
      status: 'ACTIVE',
    });

    const views = await new ListMyGroupsUseCase(groups).execute({ actor });

    expect(views.map((view) => [view.id, view.name, view.role])).toEqual([
      ['grp_casa', 'Casa', 'OWNER'],
      ['grp_viaje', 'Viaje', 'MEMBER'],
    ]);
  });
});
