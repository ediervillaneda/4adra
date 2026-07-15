import { NextFunction, Request, Response } from 'express';
import { AuditLogWriter } from '../../../domain/audit/AuditLogWriter';
import { AuthenticatedRequest } from './authenticate';
import { RequestWithId } from './requestId';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function auditTrailMiddleware(
  writer: AuditLogWriter,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        return;
      }
      const actor = (req as Partial<AuthenticatedRequest>).actor;
      const requestId = (req as Partial<RequestWithId>).requestId ?? 'unknown';
      void writer.write({
        actorId: actor?.userId.toString() ?? 'unknown',
        entity: req.path,
        entityId: req.path,
        operation: req.method,
        requestId,
        occurredAt: new Date(),
      });
    });

    next();
  };
}
