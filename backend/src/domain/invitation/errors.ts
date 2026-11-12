import { DomainError } from '../errors/DomainError';

/** El correo invitado no está en la lista de acceso de 4adra (ADR-018). */
export class EmailNotAllowedException extends DomainError {
  readonly code = 'EMAIL_NOT_ALLOWED';

  constructor() {
    super('Ese correo no está en la lista de acceso de 4adra.');
  }
}

/** El correo invitado ya es de un miembro activo del grupo. */
export class MemberAlreadyActiveException extends DomainError {
  readonly code = 'MEMBER_ALREADY_ACTIVE';

  constructor() {
    super('Esa persona ya es miembro del grupo.');
  }
}
