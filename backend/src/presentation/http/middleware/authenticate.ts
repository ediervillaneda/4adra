import { NextFunction, Request, Response } from 'express';
import { AuthenticationProvider } from '../../../domain/auth/AuthenticationProvider';
import { AuthenticatedActor } from '../../../domain/auth/AuthenticatedActor';
import { UnauthenticatedException } from '../../../domain/auth/errors';

export interface AuthenticatedRequest extends Request {
  actor: AuthenticatedActor;
}

const BEARER_PREFIX = 'Bearer ';

export function authenticateMiddleware(
  provider: AuthenticationProvider,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.header('authorization') ?? '';
    if (!header.startsWith(BEARER_PREFIX)) {
      next(new UnauthenticatedException('falta el encabezado Authorization Bearer.'));
      return;
    }
    const idToken = header.slice(BEARER_PREFIX.length).trim();
    try {
      const actor = await provider.verifyIdToken(idToken);
      (req as AuthenticatedRequest).actor = actor;
      next();
    } catch (error) {
      next(error);
    }
  };
}
