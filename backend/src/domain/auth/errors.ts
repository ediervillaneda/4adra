import { DomainError } from '../errors/DomainError';

export class UnauthenticatedException extends DomainError {
  readonly code = 'UNAUTHENTICATED';

  constructor(reason: string) {
    super(`Solicitud no autenticada: ${reason}`);
  }
}
