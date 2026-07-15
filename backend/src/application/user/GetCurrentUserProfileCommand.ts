import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';

export interface GetCurrentUserProfileCommand {
  actor: AuthenticatedActor;
}
