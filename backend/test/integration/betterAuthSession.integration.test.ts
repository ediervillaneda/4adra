import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { createAuth } from '../../src/infrastructure/auth/createAuth';
import { betterAuthSessionLookup } from '../../src/infrastructure/auth/betterAuthSessionLookup';
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
    const provider = new BetterAuthAuthenticationProvider(betterAuthSessionLookup(auth));

    const { actor } = await provider.resolveSession(SessionCredential.fromCookieHeader(cookie));

    expect(response.status).toBe(200);
    expect(actor.email.toString()).toBe('ana@example.com');
    expect(actor.displayName).toBe('Ana Pérez');
    expect(actor.userId.toString()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
  });

  it('shouldRejectForgedCookie', async () => {
    const auth = testAuth();
    const provider = new BetterAuthAuthenticationProvider(betterAuthSessionLookup(auth));

    await expect(
      provider.resolveSession(
        SessionCredential.fromCookieHeader('better-auth.session_token=forged'),
      ),
    ).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('shouldRejectExpiredSession', async () => {
    const auth = testAuth();
    const response = await auth.api.signUpEmail({
      body: { email: 'vencida@example.com', password: 'Password123!', name: 'Vencida' },
      asResponse: true,
    });
    const cookie = (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
    await env.DB.prepare(
      'UPDATE session SET expiresAt = ? WHERE userId = (SELECT id FROM "user" WHERE email = ?)',
    )
      .bind(new Date('2000-01-01T00:00:00.000Z').toISOString(), 'vencida@example.com')
      .run();
    const provider = new BetterAuthAuthenticationProvider(betterAuthSessionLookup(auth));

    await expect(
      provider.resolveSession(SessionCredential.fromCookieHeader(cookie)),
    ).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('shouldEncryptOAuthTokensAtRest', () => {
    expect(testAuth().options.account?.encryptOAuthTokens).toBe(true);
  });
});
