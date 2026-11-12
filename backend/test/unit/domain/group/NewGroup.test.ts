import { describe, it, expect } from 'vitest';
import { validateNewGroup } from '../../../../src/domain/group/NewGroup';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';

function failureOf(input: unknown): ValidationException {
  try {
    validateNewGroup(input);
  } catch (error) {
    if (error instanceof ValidationException) return error;
    throw error;
  }
  throw new Error('se esperaba ValidationException');
}

describe('validateNewGroup', () => {
  it('shouldAcceptValidGroupWithTrimmedName', () => {
    expect(
      validateNewGroup({
        name: '  Viaje Guatemala  ',
        description: 'Vacaciones 2027',
        defaultCurrency: 'USD',
      }),
    ).toEqual({ name: 'Viaje Guatemala', description: 'Vacaciones 2027', defaultCurrency: 'USD' });
  });

  it('shouldTreatBlankDescriptionAsNull', () => {
    expect(
      validateNewGroup({ name: 'Casa', description: '   ', defaultCurrency: 'COP' }).description,
    ).toBeNull();
    expect(validateNewGroup({ name: 'Casa', defaultCurrency: 'COP' }).description).toBeNull();
  });

  it('shouldRejectEmptyName', () => {
    expect(failureOf({ name: '   ', defaultCurrency: 'COP' }).details).toEqual([
      { field: 'name', reason: 'length_1_to_120' },
    ]);
  });

  it('shouldRejectNameLongerThan120Characters', () => {
    expect(failureOf({ name: 'a'.repeat(121), defaultCurrency: 'COP' }).details).toEqual([
      { field: 'name', reason: 'length_1_to_120' },
    ]);
    expect(validateNewGroup({ name: 'a'.repeat(120), defaultCurrency: 'COP' }).name).toHaveLength(
      120,
    );
  });

  it('shouldRejectDescriptionLongerThan500Characters', () => {
    const tooLong = { name: 'Casa', description: 'd'.repeat(501), defaultCurrency: 'COP' };
    expect(failureOf(tooLong).details).toEqual([
      { field: 'description', reason: 'max_length_500' },
    ]);
    expect(
      validateNewGroup({ name: 'Casa', description: 'd'.repeat(500), defaultCurrency: 'COP' })
        .description,
    ).toHaveLength(500);
  });

  it('shouldRejectUnsupportedCurrency', () => {
    expect(failureOf({ name: 'Casa', defaultCurrency: 'ARS' }).details).toEqual([
      { field: 'defaultCurrency', reason: 'unsupported_currency' },
    ]);
    expect(failureOf({ name: 'Casa' }).details).toEqual([
      { field: 'defaultCurrency', reason: 'unsupported_currency' },
    ]);
  });

  it('shouldRejectNonObjectBodyAndNonStringFields', () => {
    expect(failureOf(null).details).toEqual([{ field: 'body', reason: 'must_be_object' }]);
    expect(failureOf([]).details).toEqual([{ field: 'body', reason: 'must_be_object' }]);
    expect(failureOf({ name: 42, description: 7, defaultCurrency: 'COP' }).details).toEqual([
      { field: 'name', reason: 'length_1_to_120' },
      { field: 'description', reason: 'must_be_string' },
    ]);
  });
});
