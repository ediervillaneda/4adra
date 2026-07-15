import { UnauthenticatedException } from '../../../../src/domain/auth/errors';
import { DomainError } from '../../../../src/domain/errors/DomainError';

describe('UnauthenticatedException', () => {
  it('shouldExposeUnauthenticatedCode', () => {
    const error = new UnauthenticatedException('token inválido.');
    expect(error.code).toBe('UNAUTHENTICATED');
  });

  it('shouldIncludeReasonInMessage', () => {
    const error = new UnauthenticatedException('token inválido.');
    expect(error.message).toContain('token inválido.');
  });

  it('shouldBeInstanceOfDomainError', () => {
    const error = new UnauthenticatedException('token inválido.');
    expect(error).toBeInstanceOf(DomainError);
  });
});
