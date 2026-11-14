import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { D1InvitationRepository } from '../../src/infrastructure/d1/D1InvitationRepository';
import { InvitationAlreadyRespondedException } from '../../src/domain/invitation/errors';
import { Invitation } from '../../src/domain/invitation/Invitation';
import { GroupId } from '../../src/domain/group/GroupId';
import { Email } from '../../src/domain/user/Email';
import { UserId } from '../../src/domain/user/UserId';
import { seedAuthUser } from './seedAuthUser';

const AT = '2026-11-13T12:00:00.000Z';

/**
 * Grupo de Ana con una invitación a Juan que ya quedó en `status` (otra respuesta llegó antes);
 * devuelve la invitación tal como la leyó el caso de uso: todavía pendiente.
 */
async function seedAnsweredInvitation(suffix: string, status: string): Promise<Invitation> {
  const ana = `usr_ana_${suffix}`;
  const juan = `usr_juan_${suffix}`;
  const group = `grp_${suffix}`;
  for (const [id, email] of [
    [ana, `ana.${suffix}@example.com`],
    [juan, `juan.${suffix}@example.com`],
  ] as const) {
    await seedAuthUser(id, email);
    await env.DB.prepare(
      `INSERT INTO users (id, display_name, email, photo_url, preferred_currency, language, time_zone, status, created_at, updated_at)
       VALUES (?, ?, ?, NULL, 'COP', 'es', 'America/Bogota', 'ACTIVE', ?, ?)`,
    )
      .bind(id, id, email, AT, AT)
      .run();
  }
  await env.DB.prepare(
    `INSERT INTO groups (id, name, description, default_currency, status, created_by, created_at, updated_at)
     VALUES (?, 'Casa', NULL, 'COP', 'ACTIVE', ?, ?, ?)`,
  )
    .bind(group, ana, AT, AT)
    .run();
  const pending = Invitation.create(
    `inv_${suffix}`,
    GroupId.fromString(group),
    Email.fromString(`juan.${suffix}@example.com`),
    'MEMBER',
    UserId.fromString(ana),
    new Date(AT),
  );
  await new D1InvitationRepository(env.DB).save(pending);
  await env.DB.prepare('UPDATE invitations SET status = ? WHERE id = ?')
    .bind(status, pending.id)
    .run();
  return pending;
}

async function memberCount(groupId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS total FROM group_members WHERE group_id = ?')
    .bind(groupId)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

describe('D1InvitationRepository (integración con D1 local)', () => {
  it('saveAcceptedShouldThrowAndAddNoMemberWhenInvitationWasAnsweredMeanwhile', async () => {
    const pending = await seedAnsweredInvitation('carrera-acepta', 'DECLINED');
    const repository = new D1InvitationRepository(env.DB);

    await expect(
      repository.saveAccepted(
        pending.accept(new Date(AT)),
        UserId.fromString('usr_juan_carrera-acepta'),
        new Date(AT),
      ),
    ).rejects.toBeInstanceOf(InvitationAlreadyRespondedException);
    expect(await memberCount('grp_carrera-acepta')).toBe(0);
    expect((await repository.findById(pending.id))?.status).toBe('DECLINED');
  });

  it('saveDeclinedShouldThrowWhenInvitationWasAnsweredMeanwhile', async () => {
    const pending = await seedAnsweredInvitation('carrera-rechaza', 'ACCEPTED');
    const repository = new D1InvitationRepository(env.DB);

    await expect(
      repository.saveDeclined(pending.decline(new Date(AT)), new Date(AT)),
    ).rejects.toBeInstanceOf(InvitationAlreadyRespondedException);
    expect((await repository.findById(pending.id))?.status).toBe('ACCEPTED');
  });
});
