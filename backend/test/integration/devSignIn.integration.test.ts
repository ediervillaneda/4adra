import { describe, it, expect, beforeEach } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { createAuth } from '../../src/infrastructure/auth/createAuth';
import { D1AllowedEmailRepository } from '../../src/infrastructure/d1/D1AllowedEmailRepository';
import { Email } from '../../src/domain/user/Email';

const BASE = 'http://localhost:8787';
const allowedEmails = new D1AllowedEmailRepository(env.DB);

/** Better Auth con el login de desarrollo activo, sobre la misma D1 y secreto que el Worker. */
function devAuth(defaultEmail: string): ReturnType<typeof createAuth> {
  return createAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    isSignUpAllowed: (email) => allowedEmails.isAllowed(Email.fromString(email)),
    devSignIn: {
      defaultEmail,
      isAllowed: (email) => allowedEmails.isAllowed(Email.fromString(email)),
    },
  });
}

function sessionCookie(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

async function myEmail(cookie: string): Promise<string> {
  const response = await SELF.fetch(`${BASE}/api/v1/me`, { headers: { cookie } });
  expect(response.status).toBe(200);
  const body: { data: { email: string } } = await response.json();
  return body.data.email;
}

describe('Login de desarrollo (integración)', () => {
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM allowed_emails').run();
    await env.DB.prepare(
      `INSERT INTO allowed_emails (email, created_at) VALUES
       ('ana.dev@example.com', '2026-11-18T00:00:00.000Z'),
       ('juan.dev@example.com', '2026-11-18T00:00:00.000Z')`,
    ).run();
  });

  it('shouldOpenARealSessionForTheDevEmailAndGoHome', async () => {
    const response = await devAuth('ana.dev@example.com').handler(
      new Request(`${BASE}/api/auth/dev/entrar`),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/');
    expect(await myEmail(sessionCookie(response))).toBe('ana.dev@example.com');
  });

  it('shouldOpenASessionForAnotherAllowedEmailGivenInTheQuery', async () => {
    const response = await devAuth('ana.dev@example.com').handler(
      new Request(`${BASE}/api/auth/dev/entrar?correo=juan.dev@example.com`),
    );

    expect(response.status).toBe(302);
    expect(await myEmail(sessionCookie(response))).toBe('juan.dev@example.com');
  });

  it('shouldRejectAnEmailOutsideTheAllowList', async () => {
    const response = await devAuth('ana.dev@example.com').handler(
      new Request(`${BASE}/api/auth/dev/entrar?correo=intrusa@example.com`),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('set-cookie')).toBeNull();
    const user = await env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
      .bind('intrusa@example.com')
      .first();
    expect(user).toBeNull();
  });

  it('shouldNotExposeTheDevSignInRouteWhenItIsNotEnabled', async () => {
    // El Worker de las pruebas no define DEV_LOGIN_EMAIL, como producción.
    const response = await SELF.fetch(`${BASE}/api/auth/dev/entrar?correo=ana.dev@example.com`, {
      redirect: 'manual',
    });

    expect(response.status).toBe(404);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
