import { env } from 'cloudflare:test';
import { createAuth } from '../../src/infrastructure/auth/createAuth';

/**
 * Crea una cuenta con email/contraseña (solo en pruebas) sobre la misma D1 y secreto que el
 * Worker y devuelve la cookie de sesión, válida para las rutas /api/v1 del Worker.
 */
export async function sessionCookieFor(email: string, name: string): Promise<string> {
  const auth = createAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPasswordEnabled: true,
  });
  const response = await auth.api.signUpEmail({
    body: { email, password: 'Password123!', name },
    asResponse: true,
  });
  return (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}
