import { describe, it, expect } from 'vitest';
import { validateNewExpense } from '../../../../src/domain/expense/NewExpense';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';

function issuesOf(input: unknown): readonly { field: string; reason: string }[] {
  try {
    validateNewExpense(input, 'COP');
  } catch (error) {
    if (error instanceof ValidationException) return error.details;
    throw error;
  }
  throw new Error('se esperaba ValidationException');
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: '  Mercado  ',
    description: '   ',
    paidBy: 'user-a',
    amount: '150000',
    currency: 'COP',
    expenseDate: '2026-11-18T00:00:00Z',
    split: { type: 'EQUAL', participants: [{ userId: 'user-b' }, { userId: 'user-a' }] },
    ...overrides,
  };
}

describe('validateNewExpense', () => {
  it('shouldAcceptAValidExpenseWithTrimmedTitleAndBlankDescriptionAsNull', () => {
    const expense = validateNewExpense(validBody(), 'COP');

    expect(expense.title).toBe('Mercado');
    expect(expense.description).toBeNull();
    expect(expense.paidBy.toString()).toBe('user-a');
    expect(expense.amount.toString()).toBe('150000');
    expect(expense.expenseDate.toISOString()).toBe('2026-11-18T00:00:00.000Z');
    expect(expense.participants.map((id) => id.toString())).toEqual(['user-b', 'user-a']);
    expect(
      validateNewExpense(validBody({ description: '  Primera noche ' }), 'COP').description,
    ).toBe('Primera noche');
  });

  it('shouldRejectAnInvalidBodyTitleDescriptionPayerOrDateFieldByField', () => {
    expect(issuesOf(null)).toEqual([{ field: 'body', reason: 'must_be_object' }]);
    expect(issuesOf(validBody({ title: undefined }))).toEqual([
      { field: 'title', reason: 'length_1_to_120' },
    ]);
    expect(issuesOf(validBody({ title: '   ' }))).toEqual([
      { field: 'title', reason: 'length_1_to_120' },
    ]);
    expect(issuesOf(validBody({ title: 'a'.repeat(121) }))).toEqual([
      { field: 'title', reason: 'length_1_to_120' },
    ]);
    expect(issuesOf(validBody({ description: 'a'.repeat(501) }))).toEqual([
      { field: 'description', reason: 'max_length_500' },
    ]);
    expect(issuesOf(validBody({ paidBy: 42 }))).toEqual([{ field: 'paidBy', reason: 'required' }]);
    for (const expenseDate of ['2026-11-18', '2026-11-18T05:00:00Z', '2026-02-30T00:00:00Z', 7]) {
      expect(issuesOf(validBody({ expenseDate })), String(expenseDate)).toEqual([
        { field: 'expenseDate', reason: 'must_be_day_at_midnight_utc' },
      ]);
    }
  });

  it('shouldRejectAnotherCurrencyOrARateOtherThanOne', () => {
    const mismatch: unknown = expect.objectContaining({ code: 'CURRENCY_MISMATCH' });
    expect(() => validateNewExpense(validBody({ currency: 'USD' }), 'COP')).toThrow(mismatch);
    expect(() => validateNewExpense(validBody({ exchangeRate: '4100' }), 'COP')).toThrow(mismatch);
    expect(() => validateNewExpense(validBody({ exchangeRate: 1 }), 'COP')).toThrow(mismatch);
    for (const exchangeRate of ['1', '1.000000', undefined]) {
      expect(validateNewExpense(validBody({ exchangeRate }), 'COP').title).toBe('Mercado');
    }
  });

  it('shouldRejectAnAmountThatIsNotAPositiveDecimalString', () => {
    for (const amount of [150000, '0', '150000.5', undefined]) {
      expect(() => validateNewExpense(validBody({ amount }), 'COP'), String(amount)).toThrow(
        expect.objectContaining({ code: 'INVALID_AMOUNT' }),
      );
    }
  });

  it('shouldRejectASplitThatIsNotEqualOrHasNoValidOrRepeatedParticipants', () => {
    const invalidSplits: unknown[] = [
      undefined,
      null,
      { type: 'SHARES', participants: [{ userId: 'user-a' }] },
      { type: 'EQUAL' },
      { type: 'EQUAL', participants: [] },
      { type: 'EQUAL', participants: [{ userId: 7 }] },
      { type: 'EQUAL', participants: ['user-a'] },
      { type: 'EQUAL', participants: [null] },
      { type: 'EQUAL', participants: [{ userId: 'user-a' }, { userId: ' user-a ' }] },
    ];
    for (const split of invalidSplits) {
      expect(() => validateNewExpense(validBody({ split }), 'COP'), JSON.stringify(split)).toThrow(
        expect.objectContaining({ code: 'INVALID_SPLIT' }),
      );
    }
  });
});
