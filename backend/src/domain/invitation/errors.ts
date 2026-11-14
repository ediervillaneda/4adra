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

/** La invitación no existe o no está dirigida al correo del actor; no se distingue para no revelar su existencia. */
export class InvitationNotFoundException extends DomainError {
  readonly code = 'INVITATION_NOT_FOUND';

  constructor() {
    super('Invitación no encontrada.');
  }
}

/** La invitación llegó a su vencimiento sin respuesta. */
export class InvitationExpiredException extends DomainError {
  readonly code = 'INVITATION_EXPIRED';

  constructor() {
    super('La invitación ya venció.');
  }
}

/** La invitación ya fue aceptada, rechazada o revocada. */
export class InvitationAlreadyRespondedException extends DomainError {
  readonly code = 'INVITATION_ALREADY_RESPONDED';

  constructor() {
    super('La invitación ya fue respondida.');
  }
}

/** El enlace no existe, fue reemplazado por otro o su grupo ya no está activo. */
export class InviteLinkNotFoundException extends DomainError {
  readonly code = 'INVITE_LINK_NOT_FOUND';

  constructor() {
    super('Este enlace de invitación ya no sirve.');
  }
}

/** El enlace llegó a su vencimiento. */
export class InviteLinkExpiredException extends DomainError {
  readonly code = 'INVITE_LINK_EXPIRED';

  constructor() {
    super('Este enlace de invitación ya venció.');
  }
}
