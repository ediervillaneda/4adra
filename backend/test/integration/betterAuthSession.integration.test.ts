import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createAuth } from '../../src/infrastructure/auth/createAuth';
import { BetterAuthAuthenticationProvider } from '../../src/infrastructure/auth/BetterAuthAuthenticationProvider';
import { SessionCredential } from '../../src/domain/auth/SessionCredential';
import { UnauthenticatedException } from '../../src/domain/auth/errors';

function testAuth(): ReturnType<typeof createAuth> {
  return createAuth({
    database: env.DB,
    secret: 'test-secret-at-least-32-characters-long',
    baseURL: 'http://localhost:8787',
    emailAndPasswordEnabled: true,
  });
}

describe('Better Auth sobre D1 (integración)', () => {
  it('shouldResolveActorFromRealSessionCookie', async () => {
    const auth = testAuth();
    const response = await auth.api.signUpEmail({
      body: { email: 'ana@example.com', password: 'Password123!', name: 'Ana Pérez' },
      asResponse: true,
    });
    const cookie = (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    const provider = new BetterAuthAuthenticationProvider((headers) =>
      auth.api.getSession({ headers }),
    );

    const actor = await provider.resolveSession(SessionCredential.fromCookieHeader(cookie));

    expect(response.status).toBe(200);
    expect(actor.email.toString()).toBe('ana@example.com');
    expect(actor.displayName).toBe('Ana Pérez');
    expect(actor.userId.toString()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
  });

  it('shouldRejectForgedCookie', async () => {
    const auth = testAuth();
    const provider = new BetterAuthAuthenticationProvider((headers) =>
      auth.api.getSession({ headers }),
    );

    await expect(
      provider.resolveSession(
        SessionCredential.fromCookieHeader('better-auth.session_token=forged'),
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedException);
  });
});
