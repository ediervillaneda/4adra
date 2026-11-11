import { MiddlewareHandler } from 'hono';
import { AppEnv } from '../AppEnv';
import { AuthenticationProvider } from '../../../domain/auth/AuthenticationProvider';
import { SessionCredential } from '../../../domain/auth/SessionCredential';

export function authenticateMiddleware(
  provider: AuthenticationProvider,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const actor = await provider.resolveSession(
      SessionCredential.fromCookieHeader(c.req.header('cookie')),
    );
    c.set('actor', actor);
    await next();
  };
}
