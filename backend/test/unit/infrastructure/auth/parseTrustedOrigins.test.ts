import { describe, it, expect } from 'vitest';
import { parseTrustedOrigins } from '../../../../src/infrastructure/auth/parseTrustedOrigins';

describe('parseTrustedOrigins', () => {
  it('shouldReturnEmptyListWhenUndefinedOrBlank', () => {
    expect(parseTrustedOrigins(undefined)).toEqual([]);
    expect(parseTrustedOrigins('')).toEqual([]);
    expect(parseTrustedOrigins('   ')).toEqual([]);
  });

  it('shouldSplitTrimAndDropEmpties', () => {
    expect(parseTrustedOrigins(' http://localhost:4200 , ,https://x.dev ')).toEqual([
      'http://localhost:4200',
      'https://x.dev',
    ]);
  });
});
