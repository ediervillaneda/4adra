import { DomainError } from './DomainError';

export interface ValidationIssue {
  readonly field: string;
  readonly reason: string;
}

/** Entrada inválida con detalle por campo; Presentation la traduce a 400 VALIDATION_ERROR. */
export class ValidationException extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(readonly details: readonly ValidationIssue[]) {
    super('La solicitud contiene valores inválidos.');
  }
}
