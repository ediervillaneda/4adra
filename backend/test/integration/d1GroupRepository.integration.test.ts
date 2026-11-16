import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { D1GroupRepository } from '../../src/infrastructure/d1/D1GroupRepository';
import { GroupId } from '../../src/domain/group/GroupId';
import { UserId } from '../../src/domain/user/UserId';
import { seedAuthUser } from './seedAuthUser';

const AT = '2026-11-13T12:00:00.000Z';
const CHANGED_AT = new Date('2026-11-14T09:00:00.000Z');

interface Membership {
  role: string;
  updated_at: string;
}

/** Grupo con Ana, Beto y Juan con los roles dados; devuelve sus ids. */
async function seedGroup(
  suffix: string,
  roles: { ana: string; beto: string; juan: string },
): Promise<{ group: GroupId; ana: UserId; beto: UserId; juan: UserId }> {
  const group = `grp_${suffix}`;
  const ids: Record<string, string> = {};
  for (const name of ['ana', 'beto', 'juan'] as const) {
    const id = `usr_${name}_${suffix}`;
    ids[name] = id;
    await seedAuthUser(id, `${name}.${suffix}@example.com`);
    await env.DB.prepare(
      `INSERT INTO users (id, display_name, email, photo_url, preferred_currency, language, time_zone, status, created_at, updated_at)
       VALUES (?, ?, ?, NULL, 'COP', 'es', 'America/Bogota', 'ACTIVE', ?, ?)`,
    )
      .bind(id, name, `${name}.${suffix}@example.com`, AT, AT)
      .run();
  }
  await env.DB.prepare(
    `INSERT INTO groups (id, name, description, default_currency, status, created_by, created_at, updated_at)
     VALUES (?, 'Casa', NULL, 'COP', 'ACTIVE', ?, ?, ?)`,
  )
    .bind(group, ids['ana'], AT, AT)
    .run();
  for (const name of ['ana', 'beto', 'juan'] as const) {
    await env.DB.prepare(
      `INSERT INTO group_members (group_id, user_id, role, status, joined_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
    )
      .bind(group, ids[name], roles[name], AT, AT)
      .run();
  }
  return {
    group: GroupId.fromString(group),
    ana: UserId.fromString(ids['ana'] as string),
    beto: UserId.fromString(ids['beto'] as string),
    juan: UserId.fromString(ids['juan'] as string),
  };
}

async function membershipOf(group: GroupId, user: UserId): Promise<Membership | null> {
  return env.DB.prepare(
    'SELECT role, updated_at FROM group_members WHERE group_id = ? AND user_id = ?',
  )
    .bind(group.toString(), user.toString())
    .first<Membership>();
}

async function statusOf(
  group: GroupId,
  user: UserId,
): Promise<{ status: string; updated_at: string } | null> {
  return env.DB.prepare(
    'SELECT status, updated_at FROM group_members WHERE group_id = ? AND user_id = ?',
  )
    .bind(group.toString(), user.toString())
    .first<{ status: string; updated_at: string }>();
}

describe('D1GroupRepository.changeMemberRole', () => {
  it('shouldChangeRoleAndRecordWhen', async () => {
    const { group, ana, juan } = await seedGroup('cambia', {
      ana: 'OWNER',
      beto: 'MEMBER',
      juan: 'MEMBER',
    });

    const result = await new D1GroupRepository(env.DB).changeMemberRole(
      group,
      ana,
      juan,
      'ADMINISTRATOR',
      CHANGED_AT,
    );

    expect(result.status).toBe('CHANGED');
    expect(await membershipOf(group, juan)).toEqual({
      role: 'ADMINISTRATOR',
      updated_at: CHANGED_AT.toISOString(),
    });
  });

  it('shouldRejectWhenActorIsNoLongerOwnerAtWriteTime', async () => {
    // Beto pasó el chequeo como Owner, pero Ana lo degradó antes de que se escribiera su cambio.
    const { group, beto, juan } = await seedGroup('carrera', {
      ana: 'OWNER',
      beto: 'MEMBER',
      juan: 'MEMBER',
    });

    const result = await new D1GroupRepository(env.DB).changeMemberRole(
      group,
      beto,
      juan,
      'OWNER',
      CHANGED_AT,
    );

    expect(result).toEqual({ status: 'PERMISSION_DENIED' });
    expect(await membershipOf(group, juan)).toEqual({ role: 'MEMBER', updated_at: AT });
  });

  it('shouldReportLastOwnerOnlyWhenTheOnlyOwnerWouldBeDemoted', async () => {
    const { group, ana } = await seedGroup('ultimo', {
      ana: 'OWNER',
      beto: 'ADMINISTRATOR',
      juan: 'MEMBER',
    });

    const result = await new D1GroupRepository(env.DB).changeMemberRole(
      group,
      ana,
      ana,
      'MEMBER',
      CHANGED_AT,
    );

    expect(result).toEqual({ status: 'LAST_OWNER' });
    expect(await membershipOf(group, ana)).toEqual({ role: 'OWNER', updated_at: AT });
  });
});

describe('D1GroupRepository.removeMember', () => {
  it('shouldRemoveAndRecordWhen', async () => {
    const { group, ana, juan } = await seedGroup('remueve', {
      ana: 'OWNER',
      beto: 'MEMBER',
      juan: 'MEMBER',
    });

    const result = await new D1GroupRepository(env.DB).removeMember(group, ana, juan, CHANGED_AT);

    expect(result.status).toBe('REMOVED');
    expect(await statusOf(group, juan)).toEqual({
      status: 'REMOVED',
      updated_at: CHANGED_AT.toISOString(),
    });
  });

  it.each([
    ['MEMBER', 'MEMBER'],
    ['ADMINISTRATOR', 'ADMINISTRATOR'],
    ['ADMINISTRATOR', 'OWNER'],
  ] as const)(
    'shouldRejectWhenActorCannotRemoveTargetAtWriteTime (%s removes %s)',
    async (betoRole, juanRole) => {
      // Beto pasó el chequeo, pero cuando se escribe su remoción ya no tiene permiso sobre Juan.
      const { group, beto, juan } = await seedGroup(`no-remueve-${betoRole}-${juanRole}`, {
        ana: 'OWNER',
        beto: betoRole,
        juan: juanRole,
      });

      const result = await new D1GroupRepository(env.DB).removeMember(
        group,
        beto,
        juan,
        CHANGED_AT,
      );

      expect(result).toEqual({ status: 'PERMISSION_DENIED' });
      expect(await statusOf(group, juan)).toEqual({ status: 'ACTIVE', updated_at: AT });
    },
  );

  it('shouldReportMemberNotFoundForRemovedOrUnknownPeople', async () => {
    const { group, ana, juan } = await seedGroup('ya-removido', {
      ana: 'OWNER',
      beto: 'MEMBER',
      juan: 'MEMBER',
    });
    const repository = new D1GroupRepository(env.DB);
    await repository.removeMember(group, ana, juan, CHANGED_AT);

    for (const userId of [juan, UserId.fromString('usr_inexistente')]) {
      expect(await repository.removeMember(group, ana, userId, CHANGED_AT)).toEqual({
        status: 'MEMBER_NOT_FOUND',
      });
    }
  });
});

describe('D1GroupRepository.leaveGroup', () => {
  it('shouldLetOneOfTwoOwnersLeaveAndKeepTheOther', async () => {
    const { group, ana, beto } = await seedGroup('dos-owners-salen', {
      ana: 'OWNER',
      beto: 'OWNER',
      juan: 'MEMBER',
    });
    const repository = new D1GroupRepository(env.DB);

    const first = await repository.leaveGroup(group, ana, CHANGED_AT);
    // Beto pasó el chequeo cuando todavía eran dos Owners, pero escribe después de Ana.
    const second = await repository.leaveGroup(group, beto, CHANGED_AT);

    expect(first.status).toBe('LEFT');
    expect(await statusOf(group, ana)).toEqual({
      status: 'REMOVED',
      updated_at: CHANGED_AT.toISOString(),
    });
    expect(second).toEqual({ status: 'LAST_OWNER' });
    expect(await statusOf(group, beto)).toEqual({ status: 'ACTIVE', updated_at: AT });
  });

  it('shouldReportNotMemberForSomeoneWhoAlreadyLeft', async () => {
    const { group, juan } = await seedGroup('ya-salio', {
      ana: 'OWNER',
      beto: 'MEMBER',
      juan: 'MEMBER',
    });
    const repository = new D1GroupRepository(env.DB);
    await repository.leaveGroup(group, juan, CHANGED_AT);

    expect(await repository.leaveGroup(group, juan, CHANGED_AT)).toEqual({ status: 'NOT_MEMBER' });
  });
});

describe('D1GroupRepository.updateDetails', () => {
  async function groupRow(group: GroupId): Promise<{
    name: string;
    description: string | null;
    version: number;
    updated_at: string;
  } | null> {
    return env.DB.prepare('SELECT name, description, version, updated_at FROM groups WHERE id = ?')
      .bind(group.toString())
      .first();
  }

  it('shouldBumpTheVersionOncePerChangeEvenForEditsBasedOnTheSameRead', async () => {
    const { group, ana, beto } = await seedGroup('edita-dos', {
      ana: 'OWNER',
      beto: 'ADMINISTRATOR',
      juan: 'MEMBER',
    });
    const repository = new D1GroupRepository(env.DB);

    // Ana y Beto leyeron la versión 1 y guardan uno detrás del otro.
    const first = await repository.updateDetails(
      group,
      ana,
      { name: 'Casa de Ana', description: null },
      CHANGED_AT,
    );
    const second = await repository.updateDetails(
      group,
      beto,
      { name: 'Casa de Beto', description: 'Junio' },
      CHANGED_AT,
    );

    expect([first.status, second.status]).toEqual(['UPDATED', 'UPDATED']);
    expect(await groupRow(group)).toEqual({
      name: 'Casa de Beto',
      description: 'Junio',
      version: 3,
      updated_at: CHANGED_AT.toISOString(),
    });
  });

  it('shouldRejectWhenTheActorCanNoLongerEditAtWriteTime', async () => {
    // Juan pasó el chequeo como Administrator, pero lo degradaron antes de que se escribiera su cambio.
    const { group, juan } = await seedGroup('edita-degradado', {
      ana: 'OWNER',
      beto: 'MEMBER',
      juan: 'MEMBER',
    });

    const result = await new D1GroupRepository(env.DB).updateDetails(
      group,
      juan,
      { name: 'Mía', description: null },
      CHANGED_AT,
    );

    expect(result).toEqual({ status: 'PERMISSION_DENIED' });
    expect((await groupRow(group))?.version).toBe(1);
  });

  it('shouldReportNotMemberWhenTheActorWasRemovedBeforeTheWrite', async () => {
    const { group, ana, juan } = await seedGroup('edita-removido', {
      ana: 'OWNER',
      beto: 'MEMBER',
      juan: 'ADMINISTRATOR',
    });
    const repository = new D1GroupRepository(env.DB);
    await repository.removeMember(group, ana, juan, CHANGED_AT);

    const result = await repository.updateDetails(
      group,
      juan,
      { name: 'Mía', description: null },
      CHANGED_AT,
    );

    expect(result).toEqual({ status: 'NOT_MEMBER' });
    expect((await groupRow(group))?.name).toBe('Casa');
  });
});
