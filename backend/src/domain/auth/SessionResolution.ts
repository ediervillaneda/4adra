import { AuthenticatedActor } from './AuthenticatedActor';

/**
 * Resultado de validar una sesión. `renewedCredentials` son valores opacos (si la sesión se
 * extendió) que Presentation devuelve al cliente; el dominio no los interpreta.
 */
export interface SessionResolution {
  readonly actor: AuthenticatedActor;
  readonly renewedCredentials: readonly string[];
}
