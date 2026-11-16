import { DomainError } from '../errors/DomainError';

/** El grupo no existe o el actor no es miembro activo; no se distingue para no revelar su existencia. */
export class GroupNotFoundException extends DomainError {
  readonly code = 'GROUP_NOT_FOUND';

  constructor() {
    super('Grupo no encontrado.');
  }
}

/** El rol del actor en el grupo no permite la operación (matriz en docs/Security.md). */
export class PermissionDeniedException extends DomainError {
  readonly code = 'PERMISSION_DENIED';

  constructor() {
    super('No tienes permiso para hacer esto en el grupo.');
  }
}

/** La persona no es miembro activo del grupo (o no existe). */
export class MemberNotFoundException extends DomainError {
  readonly code = 'MEMBER_NOT_FOUND';

  constructor() {
    super('Miembro no encontrado.');
  }
}

/** La operación dejaría el grupo sin Owner activo. */
export class LastOwnerException extends DomainError {
  readonly code = 'LAST_OWNER';

  constructor() {
    super('El grupo necesita al menos un Propietario.');
  }
}

/** Nadie se remueve a sí mismo de un grupo; para irse está salir del grupo. */
export class CannotRemoveSelfException extends DomainError {
  readonly code = 'CANNOT_REMOVE_SELF';

  constructor() {
    super('No puedes removerte a ti mismo; para irte, sal del grupo.');
  }
}
