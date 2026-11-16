import { expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { sessionCookieFor } from './sessionCookieFor';

/** Ayudantes compartidos de las pruebas de integración de grupos y miembros (Worker + D1). */

export const API = 'http://localhost:8787/api/v1';

export interface Person {
  userId: string;
  cookie: string;
}

/** Sesión y perfil (vía GET /me, como hace la PWA al entrar). */
export async function signIn(email: string, name: string): Promise<Person> {
  const cookie = await sessionCookieFor(email, name);
  const me: { data: { id: string } } = await (
    await SELF.fetch(`${API}/me`, { headers: { cookie } })
  ).json();
  return { userId: me.data.id, cookie };
}

export async function createGroupAs(owner: Person, name: string): Promise<string> {
  const body: { data: { id: string } } = await (
    await SELF.fetch(`${API}/groups`, {
      method: 'POST',
      headers: { cookie: owner.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name, defaultCurrency: 'COP' }),
    })
  ).json();
  return body.data.id;
}

export function postInviteLink(person: Person, groupId: string): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/members/invite-link`, {
    method: 'POST',
    headers: { cookie: person.cookie },
  });
}

/** El Owner crea un enlace y la persona entra con él, como Member. */
export async function joinAsMember(owner: Person, person: Person, groupId: string): Promise<void> {
  const link: { data: { code: string } } = await (await postInviteLink(owner, groupId)).json();
  const response = await SELF.fetch(`${API}/invite-links/${link.data.code}/join`, {
    method: 'POST',
    headers: { cookie: person.cookie },
  });
  expect(response.status).toBe(200);
}

export function patchRole(
  actor: Person,
  groupId: string,
  userId: string,
  role: string,
): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/members/${userId}`, {
    method: 'PATCH',
    headers: { cookie: actor.cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

export function deleteMember(actor: Person, groupId: string, userId: string): Promise<Response> {
  return SELF.fetch(`${API}/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
    headers: { cookie: actor.cookie },
  });
}

export async function myGroupIds(person: Person): Promise<string[]> {
  const body: { data: { id: string }[] } = await (
    await SELF.fetch(`${API}/groups`, { headers: { cookie: person.cookie } })
  ).json();
  return body.data.map((group) => group.id);
}

/** Suma el correo a la lista de acceso y lo invita al grupo; devuelve el id de la invitación. */
export async function inviteByEmail(
  owner: Person,
  groupId: string,
  email: string,
  role: string,
): Promise<string> {
  await env.DB.prepare('INSERT OR IGNORE INTO allowed_emails (email, created_at) VALUES (?, ?)')
    .bind(email, '2026-11-12T00:00:00.000Z')
    .run();
  const response = await SELF.fetch(`${API}/groups/${groupId}/members/invitations`, {
    method: 'POST',
    headers: { cookie: owner.cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  expect(response.status).toBe(201);
  const body: { data: { invitationId: string } } = await response.json();
  return body.data.invitationId;
}

export async function errorCode(response: Response): Promise<string> {
  const body: { error: { code: string } } = await response.json();
  return body.error.code;
}

export async function membershipInD1(
  groupId: string,
  userId: string,
): Promise<{ role: string; status: string; joined_at: string } | null> {
  return env.DB.prepare(
    'SELECT role, status, joined_at FROM group_members WHERE group_id = ? AND user_id = ?',
  )
    .bind(groupId, userId)
    .first<{ role: string; status: string; joined_at: string }>();
}
