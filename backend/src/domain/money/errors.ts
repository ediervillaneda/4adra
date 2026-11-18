import { DomainError } from '../errors/DomainError';

/** Monto no positivo, no decimal o con más decimales de los que admite la moneda. */
export class InvalidAmountException extends DomainError {
  readonly code = 'INVALID_AMOUNT';

  constructor() {
    super('El monto debe ser positivo y tener los decimales que admite la moneda.');
  }
}

/** Moneda distinta de la base del grupo, o tasa distinta de 1 (todavía no hay multimoneda). */
export class CurrencyMismatchException extends DomainError {
  readonly code = 'CURRENCY_MISMATCH';

  constructor() {
    super('El gasto debe ir en la moneda base del grupo, sin tasa de cambio.');
  }
}
