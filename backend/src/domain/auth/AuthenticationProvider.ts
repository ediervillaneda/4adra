import { AuthenticatedActor } from './AuthenticatedActor';

export interface AuthenticationProvider {
  verifyIdToken(idToken: string): Promise<AuthenticatedActor>;
}
