import { Context } from 'hono';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppEnv } from '../AppEnv';
import { DomainError } from '../../../domain/errors/DomainError';
import { ValidationException } from '../../../domain/errors/ValidationException';
import { errorEnvelope } from '../responseEnvelope';

const STATUS_BY_CODE: Record<string, ContentfulStatusCode> = {
  UNAUTHENTICATED: 401,
  USER_DISABLED: 403,
  NOT_FOUND: 404,
  GROUP_NOT_FOUND: 404,
  PERMISSION_DENIED: 403,
  MEMBER_ALREADY_ACTIVE: 409,
  INVITATION_NOT_FOUND: 404,
  INVITATION_EXPIRED: 409,
  INVITATION_ALREADY_RESPONDED: 409,
  INVITE_LINK_NOT_FOUND: 404,
  INVITE_LINK_EXPIRED: 409,
  EMAIL_NOT_ALLOWED: 422,
  VALIDATION_ERROR: 400,
};

/** Traduce errores a HTTP con el sobre estándar; nunca filtra detalles internos. */
export function handleError(error: unknown, c: Context<AppEnv>): Response {
  const requestId = c.get('requestId') ?? 'unknown';

  if (error instanceof DomainError) {
    const status = STATUS_BY_CODE[error.code] ?? 400;
    const details = error instanceof ValidationException ? [...error.details] : undefined;
    return c.json(errorEnvelope(error.code, error.message, requestId, details), status);
  }

  console.error(`[error] error inesperado (requestId=${requestId})`, error);
  return c.json(errorEnvelope('INTERNAL_ERROR', 'Error interno inesperado.', requestId), 500);
}
