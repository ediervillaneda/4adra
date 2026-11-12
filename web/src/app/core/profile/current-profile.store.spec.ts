import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CurrentProfileStore } from './current-profile.store';
import { ProfileService } from './profile.service';
import { ANA_PROFILE } from './profile.fixtures';

describe('CurrentProfileStore', () => {
  const getProfile = vi.fn();

  beforeEach(() => {
    getProfile.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: ProfileService, useValue: { getProfile } }],
    });
  });

  it('shouldLoadProfileOnceAndExposeIt', async () => {
    getProfile.mockResolvedValue(ANA_PROFILE);
    const store = TestBed.inject(CurrentProfileStore);

    await store.load();
    await store.load();

    expect(store.profile()).toEqual(ANA_PROFILE);
    expect(getProfile).toHaveBeenCalledTimes(1);
  });

  it('shouldReplaceProfileAfterSave', () => {
    const store = TestBed.inject(CurrentProfileStore);

    store.set({ ...ANA_PROFILE, displayName: 'Ana' });

    expect(store.profile()?.displayName).toBe('Ana');
  });

  it('shouldStayEmptyAndAllowRetryWhenLoadFails', async () => {
    getProfile.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce(ANA_PROFILE);
    const store = TestBed.inject(CurrentProfileStore);

    await store.load();
    expect(store.profile()).toBeNull();

    await store.load();
    expect(store.profile()).toEqual(ANA_PROFILE);
  });

  it('shouldForgetProfileOnClear', async () => {
    getProfile.mockResolvedValue(ANA_PROFILE);
    const store = TestBed.inject(CurrentProfileStore);
    await store.load();

    store.clear();

    expect(store.profile()).toBeNull();
  });
});
