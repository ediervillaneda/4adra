import { describe, it, expect } from 'vitest';
import { devSignInEmail } from '../../../../src/infrastructure/auth/devSignInEmail';

describe('devSignInEmail', () => {
  it('shouldEnableDevSignInOnlyWithAnEmailAndALocalhostBaseUrl', () => {
    expect(devSignInEmail(' ana@example.com ', 'http://localhost:8787')).toBe('ana@example.com');
    expect(devSignInEmail('ana@example.com', 'http://127.0.0.1:8787')).toBe('ana@example.com');
  });

  it('shouldStayDisabledInProductionEvenIfTheVariableLeaks', () => {
    expect(devSignInEmail('ana@example.com', 'https://4adra.edier.me')).toBeNull();
    expect(devSignInEmail('ana@example.com', 'http://localhost.evil.example:8787')).toBeNull();
    expect(devSignInEmail('ana@example.com', 'https://localhost:8787')).toBeNull();
    expect(devSignInEmail('ana@example.com', 'no es una url')).toBeNull();
  });

  it('shouldStayDisabledWithoutAnEmail', () => {
    expect(devSignInEmail(undefined, 'http://localhost:8787')).toBeNull();
    expect(devSignInEmail('   ', 'http://localhost:8787')).toBeNull();
  });
});
