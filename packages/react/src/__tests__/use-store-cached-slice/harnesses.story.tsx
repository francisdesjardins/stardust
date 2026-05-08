import { useState } from 'react';
import {
  createCachedSlice,
  createStore,
  getCachedData,
  cachedIdle,
  type CachedState,
} from '@stardust/core';
import { useStoreCachedSlice } from '@stardust/react';

// ── Snapshot types ────────────────────────────────────────────────────────────

type AutoRefreshInitialSnapshot = { data: CachedState<string>; fetchCount: number };
type MultiSubscriberInitialSnapshot = { data: CachedState<string>; fetchCount: number };
type SelectorInitialSnapshot = { data: CachedState<string> };

const arInitial: AutoRefreshInitialSnapshot = { data: cachedIdle, fetchCount: 0 };
const msInitial: MultiSubscriberInitialSnapshot = { data: cachedIdle, fetchCount: 0 };
const selInitial: SelectorInitialSnapshot = { data: cachedIdle };

// ── Auto-refresh harness ──────────────────────────────────────────────────────

// fetchCount lives in the snapshot so store.reset() resets it to 0.
// Each onExpire reads the current count and returns 'v<n>' — after reset
// the counter starts at 0 again and the first fetch returns 'v1'.
const arStore = createStore(arInitial, (api) => ({
  actions: {
    cached: createCachedSlice(api, 'data', {
      expiresAfter: 60_000, // long TTL — only the first fetch matters per test
      onExpire: (_cur, storeApi) => {
        const next = storeApi.get().fetchCount + 1;
        storeApi.update((d) => {
          d.fetchCount = next;
        });
        return `v${String(next)}`;
      },
    }),
  },
}));

function ArSubscriber() {
  const state = useStoreCachedSlice(arStore, 'data');
  const data = getCachedData(state);
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="data">{data ?? 'none'}</span>
    </div>
  );
}

/**
 * Single subscriber. Idle on mount → auto-refresh fires → fresh.
 * Reset resets the snapshot (data → idle, fetchCount → 0); hook re-arms.
 */
export function AutoRefreshHarness() {
  return (
    <div>
      <ArSubscriber />
      <button
        onClick={() => {
          arStore.reset();
        }}
      >
        Reset
      </button>
    </div>
  );
}

// ── Multi-subscriber harness ──────────────────────────────────────────────────

const msStore = createStore(msInitial, (api) => ({
  actions: {
    cached: createCachedSlice(api, 'data', {
      expiresAfter: 60_000,
      onExpire: (_cur, storeApi) => {
        const next = storeApi.get().fetchCount + 1;
        storeApi.update((d) => {
          d.fetchCount = next;
        });
        return `v${String(next)}`;
      },
    }),
  },
}));

function MsSubscriber({ id }: { id: string }) {
  const state = useStoreCachedSlice(msStore, 'data');
  const data = getCachedData(state);
  return (
    <div>
      <span data-testid={`status-${id}`}>{state.status}</span>
      <span data-testid={`data-${id}`}>{data ?? 'none'}</span>
    </div>
  );
}

/**
 * Two subscribers share one Cached instance.
 * "Toggle B" unmounts/remounts the second subscriber to exercise ref-count dec/inc.
 */
export function MultiSubscriberHarness() {
  const [showB, setShowB] = useState(true);
  return (
    <div>
      <MsSubscriber id="a" />
      {showB && <MsSubscriber id="b" />}
      <button
        onClick={() => {
          setShowB((v) => !v);
        }}
      >
        Toggle B
      </button>
    </div>
  );
}

// ── Selector harness ──────────────────────────────────────────────────────────

const selStore = createStore(selInitial, (api) => ({
  actions: {
    cached: createCachedSlice(api, 'data', {
      expiresAfter: 60_000,
      onExpire: () => 'hello',
    }),
  },
}));

// Defined at module level so React Compiler does not recreate the function each render.
function selectUpper(_state: CachedState<string>, data: string | undefined): string {
  return data?.toUpperCase() ?? 'pending';
}

/**
 * Selector that uppercases the data value. Shows 'pending' until first fetch resolves.
 */
export function SelectorHarness() {
  const upper = useStoreCachedSlice(selStore, 'data', { select: selectUpper });
  return (
    <div>
      <span data-testid="upper">{upper}</span>
    </div>
  );
}
