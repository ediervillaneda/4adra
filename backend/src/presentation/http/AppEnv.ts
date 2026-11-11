import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';

/** Variables por solicitud que comparten los middlewares de Hono. */
export interface AppEnv {
  Variables: {
    requestId: string;
    actor: AuthenticatedActor;
  };
}
