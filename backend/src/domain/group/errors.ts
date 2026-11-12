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
