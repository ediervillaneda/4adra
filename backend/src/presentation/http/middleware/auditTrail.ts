import { MiddlewareHandler } from 'hono';
import { AppEnv } from '../AppEnv';
import { AuditLogWriter } from '../../../domain/audit/AuditLogWriter';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Registra en auditoría cada mutación exitosa sin retrasar la respuesta: la escritura se
 * agenda con `waitUntil` y un fallo se registra en logs sin alterar lo que recibe el cliente.
 */
export function auditTrailMiddleware(
  writer: AuditLogWriter,
  now: () => Date,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await next();

    if (!MUTATING_METHODS.has(c.req.method) || c.res.status >= 400) {
      return;
    }

    const requestId = c.get('requestId') ?? 'unknown';
    const write = writer
      .write({
        actorId: c.get('actor')?.userId.toString() ?? 'unknown',
        entity: c.req.path,
        entityId: c.req.path,
        operation: c.req.method,
        requestId,
        occurredAt: now(),
      })
      .catch((error: unknown) => {
        console.error(`[audit] no se pudo registrar la auditoría (requestId=${requestId})`, error);
      });
    c.executionCtx.waitUntil(write);
  };
}
