import { MiddlewareHandler } from 'hono';
import { AppEnv } from '../AppEnv';
import { AuthenticationProvider } from '../../../domain/auth/AuthenticationProvider';
import { SessionCredential } from '../../../domain/auth/SessionCredential';

export function authenticateMiddleware(
  provider: AuthenticationProvider,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const { actor, renewedCredentials } = await provider.resolveSession(
      SessionCredential.fromCookieHeader(c.req.header('cookie')),
    );
    c.set('actor', actor);
    // Si Better Auth extendió la sesión, la cookie renovada debe llegar al navegador.
    for (const setCookie of renewedCredentials) {
      c.header('set-cookie', setCookie, { append: true });
    }
    await next();
  };
}
