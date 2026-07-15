import { NextFunction, Request, Response } from 'express';
import { DomainError } from '../../../domain/errors/DomainError';
import { RequestWithId } from './requestId';
import { errorEnvelope } from '../responseEnvelope';

const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHENTICATED: 401,
  USER_DISABLED: 403,
  VALIDATION_ERROR: 400,
};

export function errorHandlerMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  void _next;
  const requestId = (req as Partial<RequestWithId>).requestId ?? 'unknown';

  if (error instanceof DomainError) {
    const status = STATUS_BY_CODE[error.code] ?? 400;
    res.status(status).json(errorEnvelope(error.code, error.message, requestId));
    return;
  }

  res.status(500).json(errorEnvelope('INTERNAL_ERROR', 'Error interno inesperado.', requestId));
}
