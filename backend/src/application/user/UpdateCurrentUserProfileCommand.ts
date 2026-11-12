import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';

export interface UpdateCurrentUserProfileCommand {
  actor: AuthenticatedActor;
  /** Carga no confiable (cuerpo JSON); se valida con validateProfileChanges. */
  changes: unknown;
}
