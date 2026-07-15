import { UserId } from '../../../../src/domain/user/UserId';

describe('UserId', () => {
  it('shouldCreateFromNonEmptyString', () => {
    const id = UserId.fromString('usr_ana');
    expect(id.toString()).toBe('usr_ana');
  });

  it('shouldTrimWhitespace', () => {
    const id = UserId.fromString('  usr_ana  ');
    expect(id.toString()).toBe('usr_ana');
  });

  it('shouldRejectEmptyString', () => {
    expect(() => UserId.fromString('   ')).toThrow('UserId no puede estar vacío.');
  });

  it('shouldConsiderEqualIdsAsEqual', () => {
    const a = UserId.fromString('usr_ana');
    const b = UserId.fromString('usr_ana');
    expect(a.equals(b)).toBe(true);
  });

  it('shouldConsiderDifferentIdsAsNotEqual', () => {
    const a = UserId.fromString('usr_ana');
    const b = UserId.fromString('usr_juan');
    expect(a.equals(b)).toBe(false);
  });
});
