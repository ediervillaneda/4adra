import { AuthenticatedActor } from './AuthenticatedActor';
import { SessionCredential } from './SessionCredential';

export interface AuthenticationProvider {
  resolveSession(credential: SessionCredential): Promise<AuthenticatedActor>;
}
