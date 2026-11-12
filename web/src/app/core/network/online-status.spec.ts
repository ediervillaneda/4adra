import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OnlineStatus } from './online-status';

describe('OnlineStatus', () => {
  it('onlineStatusShouldFollowWindowOnlineOfflineEvents', () => {
    const status = TestBed.inject(OnlineStatus);

    window.dispatchEvent(new Event('offline'));
    expect(status.isOnline()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(status.isOnline()).toBe(true);
  });
});
