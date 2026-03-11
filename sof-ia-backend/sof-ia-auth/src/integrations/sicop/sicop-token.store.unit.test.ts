import { describe, expect, it, vi } from 'vitest';
import { SicopTokenStore } from './sicop-token.store';

describe('sicop token store', () => {
  it('returns token when it has not expired', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const store = new SicopTokenStore();
    store.setToken('token-1', 60_000);

    expect(store.getToken()).toBe('token-1');
    expect(store.hasValidToken()).toBe(true);
    nowSpy.mockRestore();
  });

  it('invalidates token when expired', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(5_000);
    const store = new SicopTokenStore();
    store.setToken('token-2', 5_100);

    nowSpy.mockReturnValue(6_000);
    expect(store.getToken()).toBeNull();
    expect(store.hasValidToken()).toBe(false);
    nowSpy.mockRestore();
  });

  it('invalidates token manually', () => {
    const store = new SicopTokenStore();
    store.setToken('token-3', Date.now() + 10_000);
    store.invalidate();
    expect(store.getToken()).toBeNull();
  });
});
