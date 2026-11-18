import { describe, it, expect } from 'vitest';
import { ExpenseId } from '../../../../src/domain/expense/ExpenseId';

describe('ExpenseId', () => {
  it('shouldTrimValue', () => {
    expect(ExpenseId.fromString(' exp_1 ').toString()).toBe('exp_1');
  });

  it('shouldRejectEmptyValue', () => {
    expect(() => ExpenseId.fromString('  ')).toThrow('ExpenseId no puede estar vacío.');
  });
});
