import { Email } from '../../../../src/domain/user/Email';

describe('Email', () => {
  it('shouldCreateFromValidAddress', () => {
    const email = Email.fromString('ana@example.com');
    expect(email.toString()).toBe('ana@example.com');
  });

  it('shouldNormalizeToLowerCaseAndTrim', () => {
    const email = Email.fromString('  Ana@Example.COM  ');
    expect(email.toString()).toBe('ana@example.com');
  });

  it('shouldRejectAddressWithoutAtSign', () => {
    expect(() => Email.fromString('ana.example.com')).toThrow('Email inválido: ana.example.com');
  });

  it('shouldRejectAddressWithoutDomain', () => {
    expect(() => Email.fromString('ana@')).toThrow('Email inválido: ana@');
  });
});
