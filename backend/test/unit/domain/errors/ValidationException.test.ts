import { describe, it, expect } from 'vitest';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';

describe('ValidationException', () => {
  it('shouldExposeCodeAndFieldDetails', () => {
    const error = new ValidationException([{ field: 'language', reason: 'unsupported_language' }]);

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('La solicitud contiene valores inválidos.');
    expect(error.details).toEqual([{ field: 'language', reason: 'unsupported_language' }]);
  });
});
