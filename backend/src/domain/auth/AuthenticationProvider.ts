import { SessionCredential } from './SessionCredential';
import { SessionResolution } from './SessionResolution';

export interface AuthenticationProvider {
  resolveSession(credential: SessionCredential): Promise<SessionResolution>;
}
