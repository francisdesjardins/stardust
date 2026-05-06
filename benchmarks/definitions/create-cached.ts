/**
 * createCachedSlice — lightweight cache helper for the root snapshot or a typed slice.
 *
 * Benchmarks cover:
 *   - get()         read pass-through (no copy cost)
 *   - set() equal   equality shortcut — skips applyValue and notification
 *   - set() new     write + subscriber notification cycle
 *   - expire()      no-op guard vs fresh → expired transition
 *   - slice set()   nested path copy-on-write cost vs root cache
 */

import {
  cachedFresh,
  createCachedSlice,
  createStore,
  getCachedData,
  type CachedState,
} from '@stardust/core';
import { bench, group } from '../mitata.ts';

// ── Root-cache benchmarks — the store snapshot IS the cache state ─────────────

type CachePayload = {
  name: string;
  notifications: number;
  syncedAt: string;
};

const INITIAL_PAYLOAD: CachePayload = {
  name: 'Nova',
  notifications: 1,
  syncedAt: 'just now',
};

// ── Slice benchmarks — one field of the snapshot is a CachedState ────────────

type Profile = { name: string; status: string };

type SliceShape = {
  profile: CachedState<Profile>;
  notifications: number;
  syncedAt: string;
};

const INITIAL_SLICE: SliceShape = {
  profile: cachedFresh({ name: 'Nova', status: 'ready' }),
  notifications: 1,
  syncedAt: 'just now',
};

group('createCachedSlice', () => {
  // ── get ─────────────────────────────────────────────────────────────────

  bench('get() — root pass-through', function* () {
    const store = createStore(cachedFresh(structuredClone(INITIAL_PAYLOAD)), (api) => ({
      actions: { cache: createCachedSlice(api) },
    }));
    yield () => store.actions.cache.get();
  });

  // ── set ─────────────────────────────────────────────────────────────────

  bench('set() — same value (equality bypass)', function* () {
    const store = createStore(cachedFresh(structuredClone(INITIAL_PAYLOAD)), (api) => ({
      actions: { cache: createCachedSlice(api) },
    }));
    const data = getCachedData(store.getSnapshot())!;
    yield () => store.actions.cache.set(data);
  });

  bench('set() — new value (write + notify, 0 listeners)', function* () {
    let n = 0;
    const store = createStore(cachedFresh(structuredClone(INITIAL_PAYLOAD)), (api) => ({
      actions: { cache: createCachedSlice(api) },
    }));
    yield () => {
      store.actions.cache.set({ ...INITIAL_PAYLOAD, notifications: ++n });
    };
  });

  bench('set() — new value (write + notify, 1 listener)', function* () {
    let n = 0;
    const store = createStore(cachedFresh(structuredClone(INITIAL_PAYLOAD)), (api) => ({
      actions: { cache: createCachedSlice(api) },
    }));
    store.subscribe(() => {});
    yield () => {
      store.actions.cache.set({ ...INITIAL_PAYLOAD, notifications: ++n });
    };
  });

  bench('set() — new value (write + notify, 10 listeners)', function* () {
    let n = 0;
    const store = createStore(cachedFresh(structuredClone(INITIAL_PAYLOAD)), (api) => ({
      actions: { cache: createCachedSlice(api) },
    }));
    for (let i = 0; i < 10; i++) {
      store.subscribe(() => {});
    }
    yield () => {
      store.actions.cache.set({ ...INITIAL_PAYLOAD, notifications: ++n });
    };
  });

  // ── expire ───────────────────────────────────────────────────────────────

  bench('expire() — no-op (state is not fresh)', function* () {
    // Start fresh, call expire() once during setup to reach 'expired' state.
    // Subsequent iterations hit the 'not fresh' guard and return immediately.
    const store = createStore(cachedFresh(structuredClone(INITIAL_PAYLOAD)), (api) => ({
      actions: { cache: createCachedSlice(api) },
    }));
    store.actions.cache.expire();
    yield () => store.actions.cache.expire();
  });

  bench('expire() — fresh → expired', function* () {
    // Computed parameter provides a fresh store for every iteration so the
    // transition (clearExpiryTimer + setState) is always exercised.
    const makeStore = () =>
      createStore(cachedFresh(structuredClone(INITIAL_PAYLOAD)), (api) => ({
        actions: { cache: createCachedSlice(api) },
      }));
    yield {
      [0]() {
        return makeStore();
      },
      bench(store: ReturnType<typeof makeStore>) {
        store.actions.cache.expire();
      },
    };
  });

  // ── slice (nested path) ──────────────────────────────────────────────────

  bench('slice set() — same value (equality bypass)', function* () {
    const store = createStore(structuredClone(INITIAL_SLICE), (api) => ({
      actions: { profileCache: createCachedSlice(api, 'profile') },
    }));
    const profile = getCachedData(store.getSnapshot().profile)!;
    yield () => store.actions.profileCache.set(profile);
  });

  bench('slice set() — new value (copy-on-write spine + notify, 0 listeners)', function* () {
    let n = 0;
    const store = createStore(structuredClone(INITIAL_SLICE), (api) => ({
      actions: { profileCache: createCachedSlice(api, 'profile') },
    }));
    yield () => {
      store.actions.profileCache.set({ name: `Nova${String(n++)}`, status: 'ready' });
    };
  });

  bench('slice set() — new value (copy-on-write spine + notify, 1 listener)', function* () {
    let n = 0;
    const store = createStore(structuredClone(INITIAL_SLICE), (api) => ({
      actions: { profileCache: createCachedSlice(api, 'profile') },
    }));
    store.subscribe(() => {});
    yield () => {
      store.actions.profileCache.set({ name: `Nova${String(n++)}`, status: 'ready' });
    };
  });
});
