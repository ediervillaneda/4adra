import { NextFunction, Request, Response } from 'express';
import { AuthenticationProvider } from '../../../domain/auth/AuthenticationProvider';
import { AuthenticatedActor } from '../../../domain/auth/AuthenticatedActor';
import { SessionCredential } from '../../../domain/auth/SessionCredential';

export interface AuthenticatedRequest extends Request {
  actor: AuthenticatedActor;
}

export function authenticateMiddleware(
  provider: AuthenticationProvider,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = await provider.resolveSession(
        SessionCredential.fromCookieHeader(req.header('cookie')),
      );
      (req as AuthenticatedRequest).actor = actor;
      next();
    } catch (error) {
      next(error);
    }
  };
}
