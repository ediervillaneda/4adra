import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { API, Person, createGroupAs, errorCode, joinAsMember, signIn } from './groupScenario';

function patchGroup(actor: Person, groupId: string, body: unknown): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}`, {
    method: 'PATCH',
    headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function groupAsSeenBy(
  person: Person,
  groupId: string,
): Promise<{ name: string; description: string | null }> {
  const body: { data: { name: string; description: string | null } } = await (
    await SELF.fetch(`${API}/groups/${groupId}`, { headers: { cookie: person.cookie } })
  ).json();
  return { name: body.data.name, description: body.data.description };
}

async function groupInD1(groupId: string): Promise<{
  name: string;
  description: string | null;
  default_currency: string;
  version: number;
} | null> {
  return env.DB.prepare(
    'SELECT name, description, default_currency, version FROM groups WHERE id = ?',
  )
    .bind(groupId)
    .first();
}

describe('Editar el grupo (Worker + D1 + Better Auth)', () => {
  it('shouldEditTheGroupAndShowTheNewDataToOtherMembers', async () => {
    const ana = await signIn('ana.edita@example.com', 'Ana');
    const juan = await signIn('juan.edita@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const edited = await patchGroup(ana, casa, {
      name: 'Casa de la playa',
      description: 'Arriendo y servicios',
    });

    expect(edited.status).toBe(200);
    const body: { data: { name: string; description: string | null } } = await edited.json();
    expect(body.data).toMatchObject({
      name: 'Casa de la playa',
      description: 'Arriendo y servicios',
    });
    expect(await groupAsSeenBy(juan, casa)).toEqual({
      name: 'Casa de la playa',
      description: 'Arriendo y servicios',
    });
    const list: { data: { id: string; name: string }[] } = await (
      await SELF.fetch(`${API}/groups`, { headers: { cookie: juan.cookie } })
    ).json();
    expect(list.data.find((group) => group.id === casa)?.name).toBe('Casa de la playa');

    expect(
      (await patchGroup(ana, casa, { name: 'Casa de la playa', description: null })).status,
    ).toBe(200);
    expect(await groupInD1(casa)).toEqual({
      name: 'Casa de la playa',
      description: null,
      default_currency: 'COP',
      version: 3,
    });
  });

  it('shouldDenyMembersAndRejectInvalidChangesWithoutTouchingTheGroup', async () => {
    const ana = await signIn('ana.no-edita@example.com', 'Ana');
    const juan = await signIn('juan.no-edita@example.com', 'Juan');
    const casa = await createGroupAs(ana, 'Casa');
    await joinAsMember(ana, juan, casa);

    const denied = await patchGroup(juan, casa, { name: 'Mía', description: null });
    expect(denied.status).toBe(403);
    expect(await errorCode(denied)).toBe('PERMISSION_DENIED');

    const invalid = await patchGroup(ana, casa, {
      name: '',
      description: null,
      defaultCurrency: 'USD',
    });
    expect(invalid.status).toBe(400);
    const invalidBody: { error: { code: string; details: unknown[] } } = await invalid.json();
    expect(invalidBody.error.code).toBe('VALIDATION_ERROR');
    expect(invalidBody.error.details).toEqual([
      { field: 'name', reason: 'length_1_to_120' },
      { field: 'defaultCurrency', reason: 'not_allowed' },
    ]);

    expect(await groupInD1(casa)).toEqual({
      name: 'Casa',
      description: null,
      default_currency: 'COP',
      version: 1,
    });
  });
});
