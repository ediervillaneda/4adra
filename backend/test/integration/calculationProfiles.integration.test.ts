import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createGroupAs, signIn } from './groupScenario';

describe('Perfil de cálculo por defecto (migración 0006, D1 local)', () => {
  it('shouldGiveEveryGroupThePublishedDefaultProfileVersion1', async () => {
    const ana = await signIn('ana.perfil@example.com', 'Ana');
    const casa = await createGroupAs(ana, 'Casa');

    const group = await env.DB.prepare(
      'SELECT calculation_profile_id, calculation_profile_version FROM groups WHERE id = ?',
    )
      .bind(casa)
      .first();
    expect(group).toEqual({ calculation_profile_id: 'default', calculation_profile_version: 1 });
    const profile = await env.DB.prepare(
      `SELECT split_strategy, rounding_strategy FROM calculation_profiles
       WHERE id = 'default' AND version = 1`,
    ).first();
    expect(profile).toEqual({ split_strategy: 'EQUAL', rounding_strategy: 'HALF_EVEN' });
  });

  it('shouldNeverChangeOrDeleteAPublishedProfile', async () => {
    await expect(
      env.DB.prepare(
        "UPDATE calculation_profiles SET split_strategy = 'SHARES' WHERE id = 'default'",
      ).run(),
    ).rejects.toThrow(/inmutable/);
    await expect(
      env.DB.prepare("DELETE FROM calculation_profiles WHERE id = 'default'").run(),
    ).rejects.toThrow(/inmutable/);
  });
});
