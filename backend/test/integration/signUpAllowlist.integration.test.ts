import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createAuth } from '../../src/infrastructure/auth/createAuth';
import { D1AllowedEmailRepository } from '../../src/infrastructure/d1/D1AllowedEmailRepository';
import { Email } from '../../src/domain/user/Email';

const allowedEmails = new D1AllowedEmailRepository(env.DB);

function gatedAuth(): ReturnType<typeof createAuth> {
  return createAuth({
    database: env.DB,
    secret: 'test-secret-at-least-32-characters-long',
    baseURL: 'http://localhost:8787',
    emailAndPasswordEnabled: true,
    isSignUpAllowed: (email) => allowedEmails.isAllowed(Email.fromString(email)),
  });
}

async function signUp(email: string): Promise<Response> {
  return gatedAuth().api.signUpEmail({
    body: { email, password: 'Password123!', name: 'Prueba' },
    asResponse: true,
  });
}

describe('Registro solo por lista de acceso (integración)', () => {
  beforeEach(async () => {
    await env.DB.prepare('DELETE FROM session').run();
    await env.DB.prepare('DELETE FROM account').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM "user"').run();
    await env.DB.prepare('DELETE FROM allowed_emails').run();
    await env.DB.prepare(
      `INSERT INTO allowed_emails (email, created_at, revoked_at) VALUES
       ('ana@example.com', '2026-11-11T00:00:00.000Z', NULL),
       ('bruno@example.com', '2026-11-11T00:00:00.000Z', '2026-11-12T00:00:00.000Z')`,
    ).run();
  });

  it('shouldCreateAccountForListedEmail', async () => {
    const response = await signUp('ana@example.com');

    expect(response.status).toBe(200);
  });

  it('shouldRejectUnlistedEmailWithNotInvitedCode', async () => {
    const response = await signUp('eve@example.com');
    const body: { code?: string } = await response.json();
    const users = await env.DB.prepare('SELECT COUNT(*) AS total FROM "user"').first<{
      total: number;
    }>();

    expect(response.status).toBe(403);
    expect(body.code).toBe('NOT_INVITED');
    expect(users?.total).toBe(0);
  });

  it('shouldRejectRevokedEmail', async () => {
    const response = await signUp('bruno@example.com');

    expect(response.status).toBe(403);
  });

  it('shouldKeepLettingExistingUsersSignInAfterRevocation', async () => {
    await signUp('ana@example.com');
    await env.DB.prepare(
      "UPDATE allowed_emails SET revoked_at = '2026-11-13T00:00:00.000Z' WHERE email = 'ana@example.com'",
    ).run();

    const response = await gatedAuth().api.signInEmail({
      body: { email: 'ana@example.com', password: 'Password123!' },
      asResponse: true,
    });

    expect(response.status).toBe(200);
  });

  it('shouldOnlyAcceptLocalDevOriginWhenTrusted', async () => {
    const signInFrom = (trustedOrigins: string[]): Promise<Response> =>
      createAuth({
        database: env.DB,
        secret: 'test-secret-at-least-32-characters-long',
        baseURL: 'http://localhost:8787',
        google: { clientId: 'test-client', clientSecret: 'test-secret' },
        trustedOrigins,
      }).handler(
        new Request('http://localhost:8787/api/auth/sign-in/social', {
          method: 'POST',
          headers: {
            origin: 'http://localhost:4200',
            'content-type': 'application/json',
            cookie: 'better-auth.session_token=previa',
          },
          body: JSON.stringify({
            provider: 'google',
            callbackURL: '/',
            errorCallbackURL: '/entrar',
          }),
        }),
      );

    const rejected = await signInFrom([]);
    const accepted = await signInFrom(['http://localhost:4200']);
    const body: { url?: string } = await accepted.json();

    expect(rejected.status).toBe(403);
    expect(accepted.status).toBe(200);
    expect(body.url?.startsWith('https://accounts.google.com/')).toBe(true);
  });

  it('shouldRedirectOAuthStateErrorsToEntrarInsteadOfBetterAuthErrorPage', async () => {
    const auth = createAuth({
      database: env.DB,
      secret: 'test-secret-at-least-32-characters-long',
      baseURL: 'http://localhost:8787',
      google: { clientId: 'test-client', clientSecret: 'test-secret' },
    });

    const response = await auth.handler(
      new Request('http://localhost:8787/api/auth/callback/google?code=x&state=inexistente'),
    );
    const location = response.headers.get('location') ?? '';

    expect(response.status).toBe(302);
    expect(location.startsWith('/entrar?error=') || location.includes('/entrar?error=')).toBe(true);
  });
});
