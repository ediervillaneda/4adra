import { DomainError } from '../errors/DomainError';

/** El grupo no existe o el actor no es miembro activo; no se distingue para no revelar su existencia. */
export class GroupNotFoundException extends DomainError {
  readonly code = 'GROUP_NOT_FOUND';

  constructor() {
    super('Grupo no encontrado.');
  }
}
