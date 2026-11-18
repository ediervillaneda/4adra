import { InvalidAmountException } from './errors';

/** Decimales de la unidad mínima de cada moneda (docs/domain/Money.md). */
const CURRENCY_DECIMALS: Readonly<Record<string, number>> = {
  COP: 0,
  USD: 2,
  EUR: 2,
  MXN: 2,
  GTQ: 2,
};

const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;

/**
 * Cantidad exacta en una moneda, guardada como entero de unidades mínimas (`bigint`): centavos, o
 * pesos en COP. Nunca usa `number` para el valor, así que no hay errores de coma flotante.
 */
export class Money {
  private constructor(
    private readonly units: bigint,
    readonly currency: string,
  ) {}

  /** Monto no negativo escrito como decimal (así se guardan las partes de un reparto, que pueden ser 0). */
  static parse(text: string, currency: string): Money {
    const decimals = decimalsOf(currency);
    const match = DECIMAL_PATTERN.exec(text);
    const fraction = match?.[2] ?? '';
    if (!match || fraction.length > decimals) {
      throw new InvalidAmountException();
    }
    return new Money(BigInt(match[1] + fraction.padEnd(decimals, '0')), currency);
  }

  /** Monto positivo escrito como decimal canónico ("150000", "33.34"): el de un gasto. */
  static parsePositive(text: string, currency: string): Money {
    const money = Money.parse(text, currency);
    if (money.units <= 0n) {
      throw new InvalidAmountException();
    }
    return money;
  }

  /**
   * Divide el monto en `count` partes que suman exactamente el total: las unidades mínimas que
   * sobran van de a una a las primeras partes (100 COP en 3: 34, 33, 33).
   */
  allocateEqually(count: number): Money[] {
    const parts = BigInt(count);
    const base = this.units / parts;
    const remainder = this.units % parts;
    return Array.from(
      { length: count },
      (_, index) => new Money(base + (BigInt(index) < remainder ? 1n : 0n), this.currency),
    );
  }

  /** Decimal canónico con los decimales de la moneda: "150000" (COP), "100.00" (USD). */
  toString(): string {
    const decimals = decimalsOf(this.currency);
    if (decimals === 0) {
      return this.units.toString();
    }
    const digits = this.units.toString().padStart(decimals + 1, '0');
    return `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
  }
}

function decimalsOf(currency: string): number {
  const decimals = CURRENCY_DECIMALS[currency];
  if (decimals === undefined) {
    throw new Error(`Moneda no admitida: ${currency}`);
  }
  return decimals;
}
