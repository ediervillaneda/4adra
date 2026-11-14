import { describe, it, expect } from 'vitest';
import { GroupId } from '../../../../src/domain/group/GroupId';

describe('GroupId', () => {
  it('shouldTrimValue', () => {
    expect(GroupId.fromString(' grp_1 ').toString()).toBe('grp_1');
  });

  it('shouldRejectEmptyValue', () => {
    expect(() => GroupId.fromString('  ')).toThrow('GroupId no puede estar vacío.');
  });
});
