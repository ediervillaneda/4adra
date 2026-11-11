import { describe, it, expect } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { createAuth } from '../../src/infrastructure/auth/createAuth';

interface MeBody {
  data: { email: string; displayName: string };
}

interface ErrorBody {
  error: { code: string };
}

/**
 * Siembra una sesión real: el test crea su propio Better Auth con email/contraseña (solo para
 * pruebas) sobre la misma D1 y el mismo secreto que el Worker, así la cookie resultante es válida
 * para el Worker, que en producción solo habilita Google.
 */
async function seedSessionCookie(): Promise<string> {
  const auth = createAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPasswordEnabled: true,
  });
  const response = await auth.api.signUpEmail({
    body: { email: 'ana@example.com', password: 'Password123!', name: 'Ana Pérez' },
    asResponse: true,
  });
  return (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

describe('GET /api/v1/me de punta a punta (Worker + D1 + Better Auth)', () => {
  it('shouldReturnProfileForValidSession', async () => {
    const cookie = await seedSessionCookie();

    const response = await SELF.fetch('http://localhost:8787/api/v1/me', { headers: { cookie } });
    const body: MeBody = await response.json();
    const stored = await env.DB.prepare('SELECT COUNT(*) AS total FROM users WHERE email = ?')
      .bind('ana@example.com')
      .first<{ total: number }>();

    expect(response.status).toBe(200);
    expect(body.data.email).toBe('ana@example.com');
    expect(body.data.displayName).toBe('Ana Pérez');
    expect(stored?.total).toBe(1);
  });

  it('shouldReturn401WithoutSession', async () => {
    const response = await SELF.fetch('http://localhost:8787/api/v1/me');
    const body: ErrorBody = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});
