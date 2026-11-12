import { describe, it, expect } from 'vitest';
import { Group } from '../../../../src/domain/group/Group';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { UserId } from '../../../../src/domain/user/UserId';

const NOW = new Date('2026-11-12T15:00:00.000Z');

describe('Group', () => {
  it('shouldStartActiveAtVersionOne', () => {
    const group = Group.create(
      GroupId.fromString('grp_1'),
      { name: 'Casa', description: null, defaultCurrency: 'COP' },
      UserId.fromString('usr_ana'),
      NOW,
    );

    expect([group.status, group.version, group.createdBy.toString()]).toEqual([
      'ACTIVE',
      1,
      'usr_ana',
    ]);
  });

  it('shouldRestorePersistedState', () => {
    const group = Group.restore({
      id: GroupId.fromString('grp_1'),
      name: 'Casa',
      description: 'Gastos del hogar',
      defaultCurrency: 'COP',
      status: 'ARCHIVED',
      createdBy: UserId.fromString('usr_ana'),
      createdAt: NOW,
      updatedAt: NOW,
      version: 4,
    });

    expect([group.status, group.version, group.description]).toEqual([
      'ARCHIVED',
      4,
      'Gastos del hogar',
    ]);
  });
});
