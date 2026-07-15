import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface RequestWithId extends Request {
  requestId: string;
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as RequestWithId).requestId = randomUUID();
  next();
}
