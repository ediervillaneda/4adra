import { describe, it, expect } from 'vitest';
import { SessionCredential } from '../../../../src/domain/auth/SessionCredential';

describe('SessionCredential', () => {
  it('shouldBeEmptyForNullUndefinedOrBlank', () => {
    expect(SessionCredential.fromCookieHeader(null).isEmpty()).toBe(true);
    expect(SessionCredential.fromCookieHeader(undefined).isEmpty()).toBe(true);
    expect(SessionCredential.fromCookieHeader('   ').isEmpty()).toBe(true);
  });

  it('shouldKeepRawHeaderValue', () => {
    const credential = SessionCredential.fromCookieHeader('a=1; b=2');

    expect(credential.isEmpty()).toBe(false);
    expect(credential.toString()).toBe('a=1; b=2');
  });
});
