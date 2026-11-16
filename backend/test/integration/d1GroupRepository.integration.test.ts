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
