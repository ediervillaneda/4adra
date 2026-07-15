import { DomainError } from '../errors/DomainError';

export class UserDisabledException extends DomainError {
  readonly code = 'USER_DISABLED';

  constructor(userId: string) {
    super(`El usuario ${userId} está deshabilitado.`);
  }
}
