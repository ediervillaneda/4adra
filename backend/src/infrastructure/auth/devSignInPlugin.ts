import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';

export interface DevSignInOptions {
  /** Correo con el que se entra si la URL no trae `?correo=`. */
  defaultEmail: string;
  /** Lista de acceso (ADR-018): el login de desarrollo tampoco deja entrar a correos fuera de ella. */
  isAllowed: (email: string) => Promise<boolean>;
}

/**
 * Solo desarrollo: `GET /api/auth/dev/entrar[?correo=…]` abre una sesión real de Better Auth (la
 * misma cookie que deja el login con Google) para un correo de la lista de acceso, y vuelve a `/`.
 * Crea la cuenta si no existe. Nunca se registra en producción (ver devSignInEmail).
 */
export function devSignInPlugin(options: DevSignInOptions): BetterAuthPlugin {
  return {
    id: 'dev-sign-in',
    endpoints: {
      devSignIn: createAuthEndpoint('/dev/entrar', { method: 'GET' }, async (ctx) => {
        const requested = ctx.request ? new URL(ctx.request.url).searchParams.get('correo') : null;
        const email = (requested ?? options.defaultEmail).trim().toLowerCase();
        if (!(await options.isAllowed(email))) {
          throw new APIError('FORBIDDEN', {
            code: 'NOT_INVITED',
            message: 'Este correo no tiene invitación para usar 4adra.',
          });
        }
        const adapter = ctx.context.internalAdapter;
        const found = await adapter.findUserByEmail(email);
        const user =
          found?.user ??
          (await adapter.createUser(
            { email, name: email.split('@')[0] ?? email, emailVerified: true },
            { method: 'dev-sign-in' },
          ));
        const session = await adapter.createSession(user.id);
        await setSessionCookie(ctx, { session, user });
        throw ctx.redirect('/');
      }),
    },
  };
}
