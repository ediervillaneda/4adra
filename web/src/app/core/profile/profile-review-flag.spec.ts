import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProfileReviewFlag } from './profile-review-flag';

describe('ProfileReviewFlag', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shouldBeFalseUntilMarkedThenTrue', () => {
    const flag = TestBed.inject(ProfileReviewFlag);

    expect(flag.isReviewed()).toBe(false);
    flag.markReviewed();
    expect(flag.isReviewed()).toBe(true);
    expect(localStorage.getItem('4adra.profileReviewed')).toBe('1');
  });

  it('shouldTolerateUnavailableStorage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const flag = TestBed.inject(ProfileReviewFlag);

    expect(() => flag.markReviewed()).not.toThrow();
    expect(flag.isReviewed()).toBe(false);
  });
});
