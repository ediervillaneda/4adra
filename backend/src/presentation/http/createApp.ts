import express, { Express } from 'express';
import { requestIdMiddleware, RequestWithId } from './middleware/requestId';
import { authenticateMiddleware, AuthenticatedRequest } from './middleware/authenticate';
import { auditTrailMiddleware } from './middleware/auditTrail';
import { errorHandlerMiddleware } from './middleware/errorHandler';
import { asyncHandler } from './asyncHandler';
import { createGetMeHandler } from './users/meController';
import { AuthenticationProvider } from '../../domain/auth/AuthenticationProvider';
import { AuditLogWriter } from '../../domain/audit/AuditLogWriter';
import { GetCurrentUserProfileUseCase } from '../../application/user/GetCurrentUserProfileUseCase';

export interface AppDependencies {
  authenticationProvider: AuthenticationProvider;
  auditLogWriter: AuditLogWriter;
  getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(auditTrailMiddleware(dependencies.auditLogWriter));
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- el middleware nunca deja escapar rechazos: captura errores y los pasa a next().
  app.use(authenticateMiddleware(dependencies.authenticationProvider));

  app.get(
    '/v1/me',
    asyncHandler<AuthenticatedRequest & RequestWithId>(
      createGetMeHandler(dependencies.getCurrentUserProfileUseCase),
    ),
  );

  app.use(errorHandlerMiddleware);
  return app;
}
