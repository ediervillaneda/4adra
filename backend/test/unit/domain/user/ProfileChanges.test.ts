import { describe, it, expect } from 'vitest';
import { validateProfileChanges } from '../../../../src/domain/user/ProfileChanges';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';

function failureOf(input: unknown): ValidationException {
  try {
    validateProfileChanges(input);
  } catch (error) {
    if (error instanceof ValidationException) return error;
    throw error;
  }
  throw new Error('se esperaba ValidationException');
}

describe('validateProfileChanges', () => {
  it('shouldAcceptAllAllowedFieldsAndTrimDisplayName', () => {
    expect(
      validateProfileChanges({
        displayName: '  Ana Pérez  ',
        photoUrl: 'https://example.com/a.png',
        preferredCurrency: 'COP',
        language: 'en',
        timeZone: 'America/Bogota',
      }),
    ).toEqual({
      displayName: 'Ana Pérez',
      photoUrl: 'https://example.com/a.png',
      preferredCurrency: 'COP',
      language: 'en',
      timeZone: 'America/Bogota',
    });
  });

  it('shouldAcceptNullPhotoUrlAndEmptyObject', () => {
    expect(validateProfileChanges({ photoUrl: null })).toEqual({ photoUrl: null });
    expect(validateProfileChanges({})).toEqual({});
  });

  it('shouldRejectNonObjectBody', () => {
    expect(failureOf([]).details).toEqual([{ field: 'body', reason: 'must_be_object' }]);
    expect(failureOf(null).details).toEqual([{ field: 'body', reason: 'must_be_object' }]);
  });

  it('shouldRejectFieldsThatAreNotAllowed', () => {
    expect(failureOf({ email: 'x@example.com', status: 'DISABLED' }).details).toEqual([
      { field: 'email', reason: 'not_allowed' },
      { field: 'status', reason: 'not_allowed' },
    ]);
  });

  it('shouldRejectDisplayNameBlankOrLongerThan100', () => {
    expect(failureOf({ displayName: '   ' }).details).toEqual([
      { field: 'displayName', reason: 'length_1_to_100' },
    ]);
    expect(failureOf({ displayName: 'a'.repeat(101) }).details).toEqual([
      { field: 'displayName', reason: 'length_1_to_100' },
    ]);
    expect(failureOf({ displayName: 42 }).details).toEqual([
      { field: 'displayName', reason: 'must_be_string' },
    ]);
  });

  it('shouldRejectPhotoUrlThatIsNotHttps', () => {
    expect(failureOf({ photoUrl: 'http://example.com/a.png' }).details).toEqual([
      { field: 'photoUrl', reason: 'must_be_https_url' },
    ]);
    expect(failureOf({ photoUrl: 'no es url' }).details).toEqual([
      { field: 'photoUrl', reason: 'must_be_https_url' },
    ]);
  });

  it('shouldRejectUnsupportedCurrencyLanguageAndTimeZone', () => {
    expect(
      failureOf({ preferredCurrency: 'XYZ', language: 'fr', timeZone: 'Marte/Olympus' }).details,
    ).toEqual([
      { field: 'preferredCurrency', reason: 'unsupported_currency' },
      { field: 'language', reason: 'unsupported_language' },
      { field: 'timeZone', reason: 'invalid_time_zone' },
    ]);
  });
});
