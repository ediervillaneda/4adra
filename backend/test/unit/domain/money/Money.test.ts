import { describe, it, expect } from 'vitest';
import { Money } from '../../../../src/domain/money/Money';

describe('Money', () => {
  it('shouldAcceptCopWithoutDecimalsAndRejectCopWithDecimals', () => {
    const amount = Money.parsePositive('150000', 'COP');

    expect(amount.toString()).toBe('150000');
    expect(amount.currency).toBe('COP');
    expect(() => Money.parsePositive('150000.50', 'COP')).toThrow(
      expect.objectContaining({ code: 'INVALID_AMOUNT' }),
    );
    expect(() => Money.parsePositive('150000.00', 'COP')).toThrow(
      expect.objectContaining({ code: 'INVALID_AMOUNT' }),
    );
  });

  it('shouldAcceptUsdWithTwoDecimalsAndRejectThree', () => {
    expect(Money.parsePositive('33.34', 'USD').toString()).toBe('33.34');
    expect(Money.parsePositive('100', 'USD').toString()).toBe('100.00');
    expect(Money.parsePositive('0.5', 'USD').toString()).toBe('0.50');
    expect(() => Money.parsePositive('33.333', 'USD')).toThrow(
      expect.objectContaining({ code: 'INVALID_AMOUNT' }),
    );
  });

  it('shouldRejectZeroNegativeOrNonNumericAmounts', () => {
    for (const text of ['0', '0.00', '-5', '', ' 10', '1e3', '1,5', '12.', '.5', 'diez']) {
      expect(() => Money.parsePositive(text, 'USD'), text).toThrow(
        expect.objectContaining({ code: 'INVALID_AMOUNT' }),
      );
    }
  });

  it('shouldFailLoudlyForAnUnsupportedCurrency', () => {
    expect(() => Money.parsePositive('10', 'ARS')).toThrow('Moneda no admitida: ARS');
  });

  it('shouldReadAStoredAmountIncludingZeroButNeverANegativeOne', () => {
    expect(Money.parse('0', 'COP').toString()).toBe('0');
    expect(Money.parse('33.33', 'USD').toString()).toBe('33.33');
    expect(() => Money.parse('-1', 'COP')).toThrow(
      expect.objectContaining({ code: 'INVALID_AMOUNT' }),
    );
  });
});
