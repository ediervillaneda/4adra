import { describe, it, expect } from 'vitest';
import { Group } from '../../../../src/domain/group/Group';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { GroupArchivedException } from '../../../../src/domain/group/errors';
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

  it('shouldChangeNameAndDescriptionAndBumpVersionAndUpdatedAt', () => {
    const later = new Date('2026-11-20T10:00:00.000Z');
    const group = Group.restore({
      id: GroupId.fromString('grp_1'),
      name: 'Casa',
      description: 'Gastos del hogar',
      defaultCurrency: 'COP',
      status: 'ACTIVE',
      createdBy: UserId.fromString('usr_ana'),
      createdAt: NOW,
      updatedAt: NOW,
      version: 3,
    });

    const edited = group.withDetails({ name: 'Casa nueva', description: null }, later);

    expect({
      name: edited.name,
      description: edited.description,
      version: edited.version,
      updatedAt: edited.updatedAt,
      defaultCurrency: edited.defaultCurrency,
      status: edited.status,
      createdBy: edited.createdBy.toString(),
      createdAt: edited.createdAt,
      id: edited.id.toString(),
    }).toEqual({
      name: 'Casa nueva',
      description: null,
      version: 4,
      updatedAt: later,
      defaultCurrency: 'COP',
      status: 'ACTIVE',
      createdBy: 'usr_ana',
      createdAt: NOW,
      id: 'grp_1',
    });
    // El grupo original no cambia.
    expect([group.name, group.version]).toEqual(['Casa', 3]);
  });

  it('shouldArchiveAndBumpVersionAndUpdatedAt', () => {
    const later = new Date('2026-11-20T10:00:00.000Z');
    const group = Group.restore({
      id: GroupId.fromString('grp_1'),
      name: 'Casa',
      description: null,
      defaultCurrency: 'COP',
      status: 'ACTIVE',
      createdBy: UserId.fromString('usr_ana'),
      createdAt: NOW,
      updatedAt: NOW,
      version: 3,
    });

    const archived = group.archive(later);

    expect([archived.status, archived.version, archived.updatedAt, archived.name]).toEqual([
      'ARCHIVED',
      4,
      later,
      'Casa',
    ]);
    // El grupo original no cambia.
    expect([group.status, group.version]).toEqual(['ACTIVE', 3]);
  });

  it('shouldRejectChangesOnlyWhenArchived', () => {
    const active = Group.create(
      GroupId.fromString('grp_1'),
      { name: 'Casa', description: null, defaultCurrency: 'COP' },
      UserId.fromString('usr_ana'),
      NOW,
    );

    expect(() => active.ensureActive()).not.toThrow();
    expect(() => active.archive(NOW).ensureActive()).toThrow(GroupArchivedException);
    expect(new GroupArchivedException().code).toBe('GROUP_ARCHIVED');
  });
});
