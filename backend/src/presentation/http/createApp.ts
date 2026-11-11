import { Hono } from 'hono';
import { AppEnv } from './AppEnv';
import { requestIdMiddleware } from './middleware/requestId';
import { authenticateMiddleware } from './middleware/authenticate';
import { auditTrailMiddleware } from './middleware/auditTrail';
import { handleError } from './middleware/errorHandler';
import { errorEnvelope } from './responseEnvelope';
import { createGetMeHandler, createPatchMeHandler } from './users/meController';
import { AuthenticationProvider } from '../../domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../domain/audit/AuditLogWriter';
import { GetCurrentUserProfileUseCase } from '../../application/user/GetCurrentUserProfileUseCase';
import { UpdateCurrentUserProfileUseCase } from '../../application/user/UpdateCurrentUserProfileUseCase';

export interface AppDependencies {
  authenticationProvider: AuthenticationProvider;
  auditLogWriter: AuditLogWriter;
  getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase;
  updateCurrentUserProfileUseCase: UpdateCurrentUserProfileUseCase;
  /** Rutas de Better Auth (`/api/auth/*`): login con Google, callback, sesión, cierre. */
  authHandler: (request: Request) => Promise<Response>;
  generateRequestId: () => string;
}

export function createApp(dependencies: AppDependencies): Hono<AppEnv> {
  const app = new Hono<AppEnv>().basePath('/api');

  app.use(requestIdMiddleware(dependencies.generateRequestId));
  app.on(['GET', 'POST'], '/auth/*', (c) => dependencies.authHandler(c.req.raw));

  app.use(
    '/v1/*',
    auditTrailMiddleware(dependencies.auditLogWriter, () => new Date()),
  );
  app.use('/v1/*', authenticateMiddleware(dependencies.authenticationProvider));
  app.get('/v1/me', createGetMeHandler(dependencies.getCurrentUserProfileUseCase));
  app.patch('/v1/me', createPatchMeHandler(dependencies.updateCurrentUserProfileUseCase));

  app.notFound((c) =>
    c.json(
      errorEnvelope('NOT_FOUND', 'Recurso no encontrado.', c.get('requestId') ?? 'unknown'),
      404,
    ),
  );
  app.onError(handleError);
  return app;
}
