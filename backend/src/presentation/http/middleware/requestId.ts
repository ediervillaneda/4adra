import { MiddlewareHandler } from 'hono';
import { AppEnv } from '../AppEnv';

export function requestIdMiddleware(generateRequestId: () => string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set('requestId', generateRequestId());
    await next();
  };
}
