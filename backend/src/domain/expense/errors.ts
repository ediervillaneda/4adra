import { DomainError } from '../errors/DomainError';

/** Reparto con tipo no admitido, sin participantes, con participantes repetidos o que no totaliza. */
export class InvalidSplitException extends DomainError {
  readonly code = 'INVALID_SPLIT';

  constructor() {
    super('El reparto del gasto no es válido.');
  }
}

/** El pagador o algún participante no es miembro activo del grupo. */
export class MemberNotActiveException extends DomainError {
  readonly code = 'MEMBER_NOT_ACTIVE';

  constructor() {
    super('El pagador y los participantes deben ser miembros activos del grupo.');
  }
}

/** La misma `Idempotency-Key` ya se usó con otro contenido. */
export class IdempotencyConflictException extends DomainError {
  readonly code = 'IDEMPOTENCY_CONFLICT';

  constructor() {
    super('Esa clave de idempotencia ya se usó con otro contenido.');
  }
}
