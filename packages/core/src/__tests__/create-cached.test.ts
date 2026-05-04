import { expect, test } from '@playwright/test';
import {
  cachedFresh,
  cachedIdle,
  cachedPending,
  createCachedSlice,
  createStore,
  type CachedState,
} from '..';

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * Returns `cachedIdle` typed as `CachedState<T>`, preventing TypeScript's CFA
 * from narrowing the store's TSnapshot to the concrete `CachedIdle` type.
 */
function idleAs<T>(): CachedState<T> {
  return cachedIdle;
}

// ── Root snapshot ─────────────────────────────────────────────────────────────

test.describe('createCachedSlice - root snapshot', () => {
  test('get() reads CachedState and set() writes cachedFresh', () => {
    const store = createStore(idleAs<{ count: number }>(), (api) => ({
      cache: createCachedSlice(api, { keepPreviousData: true }),
    }));
    const cache = store.cache;

    expect(cache.get()).toEqual(cachedIdle);

    cache.set({ count: 1 });
    expect(cache.get().status).toBe('fresh');
    expect(store.getSnapshot()).toMatchObject({ status: 'fresh', data: { count: 1 } });
  });

  test('refresh() transitions through pending → fresh when keepPreviousData is true', async () => {
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      cache: createCachedSlice(api, { keepPreviousData: true }),
    }));
    const cache = store.cache;

    let resolveFetch: ((value: { value: string }) => void) | undefined;
    const promise = cache.refresh(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    // While in-flight: pending with previous data preserved
    expect(store.getSnapshot()).toEqual(cachedPending({ value: 'old' }));
    expect(cache.get()).toEqual(cachedPending({ value: 'old' }));

    resolveFetch?.({ value: 'new' });
    await promise;

    expect(store.getSnapshot()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
  });

  test('expire marks the cache expired and refreshIfExpired only fetches when expired', async () => {
    const store = createStore(cachedFresh({ value: 'old' }, Date.now() + 50), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    expect(cache.get().status).toBe('fresh');

    // Wait for expiry timer to fire and write cachedExpired
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cache.get().status).toBe('expired');

    let fetchCount = 0;
    await cache.refreshIfExpired(async (current) => {
      fetchCount += 1;
      expect(current).toEqual({ value: 'old' });
      return Promise.resolve({ value: 'new' });
    });

    expect(fetchCount).toBe(1);
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { value: 'new' } });

    // Should NOT fetch again — still fresh
    await cache.refreshIfExpired(async () => {
      fetchCount += 1;
      return Promise.resolve({ value: 'newer' });
    });

    expect(fetchCount).toBe(1);
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
  });

  test('expire auto-refresh does not fire at construction — timer starts only after startAutoRefresh()', async () => {
    let autoRefreshCount = 0;
    const store = createStore(cachedFresh({ value: 'old' }, Date.now() + 50), (api) => ({
      cache: createCachedSlice(api, {
        refreshOnExpire: async () => {
          autoRefreshCount += 1;
          return Promise.resolve({ value: 'new' });
        },
      }),
    }));
    const cache = store.cache;

    // Do NOT call startAutoRefresh() — auto-fetch must not fire.
    // Expiry timer DOES fire (to write cachedExpired) but no fetch happens.
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(autoRefreshCount).toBe(0);
    expect(cache.get().status).toBe('expired');
    cache.stopAutoRefresh();
  });

  test('stopAutoRefresh() keeps the expiry timer alive — cache still transitions to expired', async () => {
    let autoRefreshCount = 0;
    const store = createStore(cachedFresh({ value: 'old' }, Date.now() + 50), (api) => ({
      cache: createCachedSlice(api, {
        refreshOnExpire: async () => {
          autoRefreshCount += 1;
          return Promise.resolve({ value: 'refreshed' });
        },
      }),
    }));
    const cache = store.cache;

    // Simulate disabling auto-refresh on mount (e.g. feature toggle off)
    cache.stopAutoRefresh();

    const states: string[] = [];
    store.subscribe(() => {
      states.push(store.getSnapshot().status);
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Timer still fires → 'fresh' → 'expired' transition observable
    expect(cache.get().status).toBe('expired');
    expect(states).toContain('expired');
    // No fetch — autoRefreshEnabled is false
    expect(autoRefreshCount).toBe(0);
  });

  test('startAutoRefresh() when already expired immediately triggers the fetch', async () => {
    let autoRefreshCount = 0;
    const store = createStore(cachedFresh({ value: 'old' }, Date.now() + 50), (api) => ({
      cache: createCachedSlice(api, {
        refreshOnExpire: async () => {
          autoRefreshCount += 1;
          return Promise.resolve({ value: 'new' });
        },
      }),
    }));
    const cache = store.cache;

    // Wait for cache to expire without auto-refresh armed
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cache.get().status).toBe('expired');

    // Now arm auto-refresh — should immediately fetch since already expired
    cache.startAutoRefresh({ interval: 50 });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(autoRefreshCount).toBeGreaterThanOrEqual(1);
    expect(cache.get().status).toBe('fresh');
    cache.stopAutoRefresh();
  });

  test('expire auto-refresh uses provided callback when the timer expires', async () => {
    let autoRefreshCount = 0;
    let firstRefresh = true;
    const store = createStore(cachedFresh({ value: 'old' }, Date.now() + 50), (api) => ({
      cache: createCachedSlice(api, {
        refreshOnExpire: async (current) => {
          autoRefreshCount += 1;
          if (firstRefresh) {
            expect(current).toEqual({ value: 'old' });
            firstRefresh = false;
          }
          return Promise.resolve({ value: 'new' });
        },
      }),
    }));
    const cache = store.cache;

    cache.startAutoRefresh({ interval: 50 });

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(autoRefreshCount).toBeGreaterThanOrEqual(1);
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
    cache.stopAutoRefresh();
  });

  test('expire auto-refresh commits helper-level placeholder when keepPreviousData is false', async () => {
    const states: CachedState<{ value: string }>[] = [];
    const store = createStore(cachedFresh({ value: 'old' }, Date.now() + 100), (api) => ({
      cache: createCachedSlice(api, {
        placeholder: { value: 'loading' },
        refreshOnExpire: async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return { value: 'new' };
        },
      }),
    }));
    const cache = store.cache;
    store.subscribe(() => {
      states.push(store.getSnapshot());
    });

    cache.startAutoRefresh({ interval: 100 });
    // expire=100ms + fetch=30ms → one full cycle at ~t=130ms; stop at t=200ms before second cycle
    await new Promise((resolve) => setTimeout(resolve, 200));
    cache.stopAutoRefresh();

    // placeholder must appear as pending data before the resolved value
    expect(states.some((s) => s.status === 'pending' && s.data?.value === 'loading')).toBe(true);
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
  });

  test('refresh() writes cachedPending with undefined data when keepPreviousData is false', async () => {
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    let resolveFetch: ((value: { value: string }) => void) | undefined;
    const promise = cache.refresh(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    expect(store.getSnapshot()).toEqual(cachedPending(undefined));

    resolveFetch?.({ value: 'new' });
    await promise;

    expect(store.getSnapshot()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
  });

  test('refresh() writes placeholder into CachedPending.data when provided', async () => {
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    let resolveFetch: ((value: { value: string }) => void) | undefined;
    const promise = cache.refresh(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      { placeholder: { value: 'loading' } }
    );

    expect(store.getSnapshot()).toEqual(cachedPending({ value: 'loading' }));

    resolveFetch?.({ value: 'new' });
    await promise;

    expect(store.getSnapshot()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
  });

  test('refresh() falls back to helper-level placeholder when no per-call options are provided', async () => {
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      cache: createCachedSlice(api, { placeholder: { value: 'loading' } }),
    }));
    const cache = store.cache;

    let resolveFetch: ((value: { value: string }) => void) | undefined;
    const promise = cache.refresh(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      // no per-call options — should fall back to helper-level placeholder
    );

    expect(store.getSnapshot()).toEqual(cachedPending({ value: 'loading' }));

    resolveFetch?.({ value: 'new' });
    await promise;

    expect(store.getSnapshot()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
  });

  test('refresh() deduplicates concurrent calls — fetcher runs only once', async () => {
    let fetchCount = 0;
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    let resolveFetch: ((value: { value: string }) => void) | undefined;
    const fetcher = () =>
      new Promise<{ value: string }>((resolve) => {
        fetchCount += 1;
        resolveFetch = resolve;
      });

    const p1 = cache.refresh(fetcher);
    const p2 = cache.refresh(fetcher); // concurrent

    resolveFetch?.({ value: 'new' });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(fetchCount).toBe(1);
    expect(r1).toEqual({ value: 'new' });
    expect(r2).toEqual({ value: 'new' });
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
  });

  test('refresh() transitions to cachedRejected when the fetcher throws', async () => {
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    const boom = new Error('boom');
    await expect(cache.refresh(async () => Promise.reject(boom))).rejects.toThrow('boom');

    const state = cache.get();
    expect(state.status).toBe('rejected');
    if (state.status === 'rejected') {
      expect(state.error).toBe(boom);
      expect(state.data).toEqual({ value: 'old' }); // previous data preserved
    }
  });

  test('set() uses custom equals and skips redundant fresh writes', () => {
    const store = createStore(cachedFresh({ count: 0, version: 1 }), (api) => ({
      cache: createCachedSlice(api, {
        keepPreviousData: true,
        equals: (a, b) => a.count === b.count,
      }),
    }));
    const cache = store.cache;
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });

    cache.set({ count: 0, version: 2 });
    // Equal by custom equals (count unchanged) — no store write
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { count: 0, version: 1 } });
    expect(notifications).toBe(0);

    cache.set({ count: 1, version: 2 });
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { count: 1, version: 2 } });
    expect(notifications).toBe(1);
  });

  test('expire() manually transitions from fresh to expired', () => {
    const store = createStore(cachedFresh({ value: 'data' }), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    expect(cache.get().status).toBe('fresh');
    cache.expire();
    expect(cache.get().status).toBe('expired');
    expect(cache.get()).toMatchObject({ status: 'expired', data: { value: 'data' } });
  });

  test('initial cachedFresh with expiresAt auto-expires and notifies without expire option', async () => {
    const store = createStore(cachedFresh({ value: 'data' }, Date.now() + 50), (api) => ({
      cache: createCachedSlice(api), // no expire option
    }));
    const cache = store.cache;

    const states: string[] = [];
    store.subscribe(() => {
      states.push(store.getSnapshot().status);
    });

    expect(cache.get().status).toBe('fresh');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cache.get().status).toBe('expired');
    expect(states).toContain('expired'); // subscriber was notified
  });

  test('startAutoRefresh() with no initial expiresAt arms the first expiry from interval', async () => {
    let autoRefreshCount = 0;
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      // No expiresAt on initial state — startAutoRefresh interval drives the first expiry
      cache: createCachedSlice(api, {
        refreshOnExpire: async () => {
          autoRefreshCount += 1;
          return Promise.resolve({ value: 'new' });
        },
      }),
    }));
    const cache = store.cache;

    cache.startAutoRefresh({ interval: 50 });
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(autoRefreshCount).toBeGreaterThanOrEqual(1);
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { value: 'new' } });
    cache.stopAutoRefresh();
  });

  test('set() with expiresAt stamps TTL — without expiresAt stays fresh indefinitely', async () => {
    const store = createStore(cachedFresh({ value: 'data' }), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    // Write with a 50ms TTL
    cache.set({ value: 'timed' }, Date.now() + 50);
    expect(cache.get().status).toBe('fresh');

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cache.get().status).toBe('expired');

    // Overwrite without TTL — stays fresh indefinitely
    cache.set({ value: 'indefinite' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cache.get().status).toBe('fresh');
  });

  test('refresh() with expiresAt stamps TTL on the result', async () => {
    const store = createStore(cachedFresh({ value: 'old' }), (api) => ({
      cache: createCachedSlice(api),
    }));
    const cache = store.cache;

    await cache.refresh(async () => Promise.resolve({ value: 'new' }), {
      expiresAt: Date.now() + 50,
    });
    expect(cache.get().status).toBe('fresh');

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(cache.get().status).toBe('expired');
  });

  test('expire() is a no-op on non-fresh states', async () => {
    // idle
    const idleStore = createStore(idleAs<{ v: number }>(), (api) => ({
      cache: createCachedSlice(api),
    }));
    idleStore.cache.expire();
    expect(idleStore.cache.get().status).toBe('idle');

    // pending
    let resolvePending: ((v: { v: number }) => void) | undefined;
    const pendingStore = createStore(idleAs<{ v: number }>(), (api) => ({
      cache: createCachedSlice(api),
    }));
    const pendingPromise = pendingStore.cache.refresh(
      () =>
        new Promise((r) => {
          resolvePending = r;
        })
    );
    expect(pendingStore.cache.get().status).toBe('pending');
    pendingStore.cache.expire();
    expect(pendingStore.cache.get().status).toBe('pending');
    resolvePending?.({ v: 1 });
    await pendingPromise;

    // rejected
    const rejectedStore = createStore(idleAs<{ v: number }>(), (api) => ({
      cache: createCachedSlice(api),
    }));
    await expect(
      rejectedStore.cache.refresh(async () => Promise.reject(new Error('boom')))
    ).rejects.toThrow();
    expect(rejectedStore.cache.get().status).toBe('rejected');
    rejectedStore.cache.expire();
    expect(rejectedStore.cache.get().status).toBe('rejected');
  });

  test('refresh() called while already pending shares the in-flight promise — fetcher runs once', async () => {
    let fetchCount = 0;
    const store = createStore(idleAs<{ v: number }>(), (api) => ({
      cache: createCachedSlice(api),
    }));

    let resolveFetch: ((value: { v: number }) => void) | undefined;
    const p1 = store.cache.refresh(
      () =>
        new Promise((resolve) => {
          fetchCount += 1;
          resolveFetch = resolve;
        })
    );

    // State is now pending — call refresh() again with a different fetcher
    expect(store.cache.get().status).toBe('pending');
    const p2 = store.cache.refresh(() => {
      fetchCount += 1;
      return Promise.resolve({ v: 99 });
    });

    resolveFetch?.({ v: 1 });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(fetchCount).toBe(1);
    expect(r1).toEqual({ v: 1 });
    expect(r2).toEqual({ v: 1 });
    expect(store.cache.get()).toMatchObject({ status: 'fresh', data: { v: 1 } });
  });

  test('set() without expire option clears expiresAt — subsequent writes stay fresh indefinitely', async () => {
    const store = createStore(cachedFresh({ value: 'data' }, Date.now() + 50), (api) => ({
      cache: createCachedSlice(api), // no expire option
    }));
    const cache = store.cache;

    // Overwrite before the timer fires — new write has no expiresAt
    cache.set({ value: 'updated' });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Still fresh — set() without expire option resets to indefinite freshness
    expect(cache.get().status).toBe('fresh');
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { value: 'updated' } });
  });
});

// ── Sub-slice ─────────────────────────────────────────────────────────────────

test.describe('createCachedSlice - sub-slice', () => {
  test('get() returns CachedState and set() writes cachedFresh to the slice path', () => {
    const store = createStore({ profile: idleAs<{ name: string }>(), version: 1 }, (api) => ({
      cache: createCachedSlice(api, 'profile', { keepPreviousData: true }),
    }));
    const cache = store.cache;

    expect(cache.get()).toEqual(cachedIdle);

    cache.set({ name: 'Bob' });
    expect(cache.get()).toMatchObject({ status: 'fresh', data: { name: 'Bob' } });
    // Rest of snapshot is unchanged
    expect(store.getSnapshot().version).toBe(1);
  });

  test('refresh() updates the selected slice after async fetch', async () => {
    const store = createStore({ profile: cachedFresh({ name: 'Alice' }), version: 1 }, (api) => ({
      cache: createCachedSlice(api, 'profile'),
    }));
    const cache = store.cache;

    let resolveFetch: ((value: { name: string }) => void) | undefined;
    const promise = cache.refresh(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      { placeholder: { name: 'Loading' } }
    );

    expect(store.getSnapshot().profile).toEqual(cachedPending({ name: 'Loading' }));

    resolveFetch?.({ name: 'Charlie' });
    await promise;

    expect(store.getSnapshot().profile).toMatchObject({
      status: 'fresh',
      data: { name: 'Charlie' },
    });
    expect(store.getSnapshot().version).toBe(1);
  });

  test('set() uses custom equals for cached slices and skips redundant writes', () => {
    const store = createStore(
      { profile: cachedFresh({ name: 'Alice', status: 'ready' }), version: 1 },
      (api) => ({
        cache: createCachedSlice(api, 'profile', {
          keepPreviousData: true,
          equals: (a, b) => a.name === b.name,
        }),
      })
    );
    const cache = store.cache;
    let notifications = 0;
    store.subscribe(() => {
      notifications++;
    });

    cache.set({ name: 'Alice', status: 'updated' });
    // Equal by custom equals (name unchanged) — no store write
    expect(store.getSnapshot().profile).toMatchObject({
      status: 'fresh',
      data: { name: 'Alice', status: 'ready' },
    });
    expect(notifications).toBe(0);

    cache.set({ name: 'Bob', status: 'ready' });
    expect(store.getSnapshot().profile).toMatchObject({
      status: 'fresh',
      data: { name: 'Bob', status: 'ready' },
    });
    expect(notifications).toBe(1);
  });

  test('expire() on sub-slice transitions only that slice to expired', () => {
    const store = createStore({ profile: cachedFresh({ name: 'Alice' }), version: 1 }, (api) => ({
      cache: createCachedSlice(api, 'profile'),
    }));
    const cache = store.cache;

    cache.expire();

    expect(store.getSnapshot().profile.status).toBe('expired');
    expect(store.getSnapshot().version).toBe(1);
  });

  test('initial sub-slice cachedFresh with expiresAt auto-expires and notifies without expire option', async () => {
    const store = createStore(
      { profile: cachedFresh({ name: 'Alice' }, Date.now() + 50), version: 1 },
      (api) => ({
        cache: createCachedSlice(api, 'profile'), // no expire option
      })
    );
    const cache = store.cache;

    const states: string[] = [];
    store.subscribe(() => {
      states.push(store.getSnapshot().profile.status);
    });

    expect(cache.get().status).toBe('fresh');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(cache.get().status).toBe('expired');
    expect(states).toContain('expired'); // subscriber was notified
    expect(store.getSnapshot().version).toBe(1); // rest of snapshot unchanged
  });
});
