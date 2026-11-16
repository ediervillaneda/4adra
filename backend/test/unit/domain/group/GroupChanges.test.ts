import { describe, it, expect } from 'vitest';
import { validateGroupChanges } from '../../../../src/domain/group/GroupChanges';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';

function failureOf(input: unknown): ValidationException {
  try {
    validateGroupChanges(input);
  } catch (error) {
    if (error instanceof ValidationException) return error;
    throw error;
  }
  throw new Error('se esperaba ValidationException');
}

describe('validateGroupChanges', () => {
  it('shouldTrimNameAndDescriptionAndTurnAnEmptyDescriptionIntoNull', () => {
    expect(validateGroupChanges({ name: '  Viaje  ', description: '  Junio ' })).toEqual({
      name: 'Viaje',
      description: 'Junio',
    });
    for (const description of [null, '', '   ']) {
      expect(validateGroupChanges({ name: 'Viaje', description })).toEqual({
        name: 'Viaje',
        description: null,
      });
    }
  });

  it('shouldRequireDescriptionSoThatClearingItIsExplicit', () => {
    expect(failureOf({ name: 'Viaje' }).details).toEqual([
      { field: 'description', reason: 'required' },
    ]);
  });

  it('shouldApplyTheSameNameAndDescriptionRulesAsCreating', () => {
    for (const name of ['', '   ', 'x'.repeat(121), 42, undefined]) {
      expect(failureOf({ name, description: null }).details).toEqual([
        { field: 'name', reason: 'length_1_to_120' },
      ]);
    }
    expect(failureOf({ name: 'Viaje', description: 'x'.repeat(501) }).details).toEqual([
      { field: 'description', reason: 'max_length_500' },
    ]);
    expect(failureOf({ name: 'Viaje', description: 7 }).details).toEqual([
      { field: 'description', reason: 'must_be_string' },
    ]);
    expect(validateGroupChanges({ name: 'x'.repeat(120), description: 'x'.repeat(500) })).toEqual({
      name: 'x'.repeat(120),
      description: 'x'.repeat(500),
    });
  });

  it('shouldRejectNonObjectBody', () => {
    for (const input of [null, 'Viaje', ['Viaje']]) {
      expect(failureOf(input).details).toEqual([{ field: 'body', reason: 'must_be_object' }]);
    }
  });

  it('shouldRejectAnyOtherFieldIncludingTheBaseCurrency', () => {
    expect(
      failureOf({ name: 'Viaje', description: null, defaultCurrency: 'USD', status: 'X' }).details,
    ).toEqual([
      { field: 'defaultCurrency', reason: 'not_allowed' },
      { field: 'status', reason: 'not_allowed' },
    ]);
  });
});
