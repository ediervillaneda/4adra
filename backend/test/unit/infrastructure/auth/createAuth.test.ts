import { describe, it, expect } from 'vitest';
import { createAuth } from '../../../../src/infrastructure/auth/createAuth';

const database = {} as D1Database;

describe('createAuth', () => {
  it('shouldRejectMissingSecret', () => {
    expect(() => createAuth({ database, secret: '', baseURL: 'https://4adra.edier.me' })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it('shouldRejectSecretShorterThan32Characters', () => {
    expect(() =>
      createAuth({ database, secret: 'too-short', baseURL: 'https://4adra.edier.me' }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
  // El caso válido (secreto ≥ 32) lo cubren las pruebas de integración con D1 real.
});
