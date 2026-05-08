import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { StoreContract, StoreApi, PathsOf, ValueAtPath } from '@stardust/core';
import { createCachedSlice, getCachedData, getCachedSliceInstance } from '@stardust/core';
import type { CachedState, Cached } from '@stardust/core';

// ── Internal types ────────────────────────────────────────────────────────────

type SnapshotOf<TStore> = TStore extends StoreContract<infer S> ? S : never;

/** Unwraps `TData` from `CachedState<TData>`. */
type CachedValueOf<T> = T extends { data: infer U } ? U : never;

/**
 * Walks up the dot-path chain to detect whether any prefix already resolves to a
 * `CachedState`. Prevents selecting sub-fields *inside* a CachedState object.
 */
type HasCachedAncestor<TSnapshot, P extends string> = P extends `${infer Prefix}.${string}`
  ? [ValueAtPath<TSnapshot, Prefix>] extends [CachedState<unknown>]
    ? true
    : HasCachedAncestor<TSnapshot, Prefix>
  : false;

/**
 * Filters `PathsOf<TSnapshot>` to only paths whose value is a top-level
 * `CachedState<T>` — not a field nested inside one.
 */
type CachedPathsOf<TSnapshot> = {
  [P in PathsOf<TSnapshot>]: [ValueAtPath<TSnapshot, P>] extends [never]
    ? never
    : [ValueAtPath<TSnapshot, P>] extends [CachedState<unknown>]
      ? HasCachedAncestor<TSnapshot, P> extends true
        ? never
        : P
      : never;
}[PathsOf<TSnapshot>];

/** Tracks how many components are currently subscribed to the same cached slice. */
type RefCountEntry = {
  readonly refCount: number;
  readonly autoRefreshConfigured: boolean;
};

// WeakMap keys use object identity only — the generic on Cached<T> is irrelevant
// for lookup, so we key by `object` to avoid threading the value type through maps.
const cachedRefCounts = new WeakMap<object, RefCountEntry>();
const cachedInstanceCache = new WeakMap<object, Map<string, Cached<unknown>>>();

// ── Options ───────────────────────────────────────────────────────────────────

/**
 * Options for `useStoreCachedSlice`.
 *
 * - `select`  — selector that receives the full `CachedState<T>` union and the
 *               extracted data (or `undefined`). The component re-renders only
 *               when the returned value changes under `Object.is` (or `equals`).
 * - `equals`  — custom equality for the selected value. Defaults to `Object.is`.
 */
export type UseStoreCachedSliceOptions<TCachedState, TSelected> = {
  readonly select?:
    | ((cached: TCachedState, data: CachedValueOf<TCachedState> | undefined) => TSelected)
    | undefined;
  readonly equals?: ((a: TSelected, b: TSelected) => boolean) | undefined;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * React hook to subscribe to a `CachedState<T>` slice within a Stardust store.
 *
 * **Auto-refresh coordination**: multiple components using the same `(store, path)`
 * pair share one `Cached<T>` instance. The registry-first lookup returns the
 * store-builder's instance (which has `onExpire` wired up) when available; a bare
 * instance is created only for ad-hoc usage without a builder-declared slice.
 * Only the first mount calls `startAutoRefresh()` and only the last unmount calls
 * `stopAutoRefresh()`.
 *
 * **Idle → expired transition**: on mount, if the slice is `'idle'` and
 * `isAutoRefreshable` is `true`, it is immediately expired so that `onExpire` kicks in.
 *
 * @param store   - The Stardust store instance.
 * @param path    - Dot-notation path to a `CachedState<T>` field in the snapshot.
 * @param options - Optional `select` and `equals`. Without a selector the full
 *                  `CachedState<T>` is returned; with one, the selector's return
 *                  type is returned instead.
 *
 * @example — no selector
 * const cached = useStoreCachedSlice(store, 'api.data');
 * if (cached.status === 'fresh') return <p>{cached.data.name}</p>;
 *
 * @example — with selector
 * const name = useStoreCachedSlice(store, 'api.data', {
 *   select: (cached, data) => (cached.status === 'fresh' ? data?.name : null),
 * });
 */
export function useStoreCachedSlice<
  TStore extends StoreContract<unknown>,
  TPath extends CachedPathsOf<SnapshotOf<TStore>>,
>(store: TStore, path: TPath): ValueAtPath<SnapshotOf<TStore>, TPath>;

export function useStoreCachedSlice<
  TStore extends StoreContract<unknown>,
  TPath extends CachedPathsOf<SnapshotOf<TStore>>,
  TSelected,
>(
  store: TStore,
  path: TPath,
  options: UseStoreCachedSliceOptions<ValueAtPath<SnapshotOf<TStore>, TPath>, TSelected>
): TSelected;

export function useStoreCachedSlice<
  TStore extends StoreContract<unknown>,
  TPath extends CachedPathsOf<SnapshotOf<TStore>>,
  // TSlice defaults to the full CachedState<T> at the path so callers that omit
  // `select` get back the correctly-typed union without having to write it out.
  TSlice = ValueAtPath<SnapshotOf<TStore>, TPath>,
>(
  store: TStore,
  path: TPath,
  options?: UseStoreCachedSliceOptions<ValueAtPath<SnapshotOf<TStore>, TPath>, TSlice>
): TSlice {
  type TStateAtPath = ValueAtPath<SnapshotOf<TStore>, TPath>;

  const select = options?.select;
  const equals = options?.equals ?? Object.is;

  // createCachedSlice requires a StoreApi (write-side) rather than StoreContract (read-only).
  // The cast is safe: every store from createStore satisfies StoreApi internally.
  // We preserve SnapshotOf<TStore> so createCachedSlice can verify the path at compile time.
  const storeApi = store as unknown as StoreApi<SnapshotOf<TStore>, unknown>;

  // ── Cached instance management ────────────────────────────────────────────
  // Prefer the store-builder's registered instance (which has onExpire configured).
  // Fall back to creating a bare instance for ad-hoc usage; startAutoRefresh will
  // be a noop on it since isAutoRefreshable will be false.

  const getCachedInstance = (): Cached<unknown> => {
    // store.getSnapshot === api.get === sub.getSnapshot — same reference used as registry key.
    const fromRegistry = getCachedSliceInstance(store.getSnapshot, path);
    if (fromRegistry) {
      return fromRegistry;
    }

    let pathMap = cachedInstanceCache.get(store);
    if (!pathMap) {
      pathMap = new Map();
      cachedInstanceCache.set(store, pathMap);
    }

    const existing = pathMap.get(path);
    if (existing) {
      return existing;
    }

    const fresh = createCachedSlice(storeApi, path) as unknown as Cached<unknown>;
    pathMap.set(path, fresh);
    return fresh;
  };

  const cached = getCachedInstance();

  // ── Auto-refresh reference counting ──────────────────────────────────────
  // Multiple components may subscribe to the same cached slice.
  // Only the first mount starts auto-refresh; only the last unmount stops it.
  useEffect(() => {
    const entry = cachedRefCounts.get(cached);
    const isFirstMount = entry === undefined;
    const newRefCount = (entry?.refCount ?? 0) + 1;
    // Use isAutoRefreshable rather than deriving from initial status — a store that
    // starts idle but has onExpire configured should still arm auto-refresh on mount.
    const autoRefreshConfigured = entry?.autoRefreshConfigured ?? cached.isAutoRefreshable;

    cachedRefCounts.set(cached, { refCount: newRefCount, autoRefreshConfigured });

    // Transition idle → expired BEFORE startAutoRefresh so that startAutoRefresh sees
    // 'expired' and immediately fires onExpire. If called after, startAutoRefresh would
    // see 'idle' and do nothing (no idle branch in its state machine).
    if (autoRefreshConfigured && cached.get().status === 'idle') {
      const storeWithRun = store as { run?: (name: string, fn: () => void) => void };
      storeWithRun.run?.('useStoreCachedSlice:idle-to-expired', () => {
        cached.expire();
      });
    }

    if (isFirstMount && autoRefreshConfigured) {
      // No explicit expiresAfter — the Cached instance uses its stored CachedOptions value.
      cached.startAutoRefresh();
    }

    // Re-arm auto-refresh when the snapshot is externally reset to idle while this
    // component is still mounted (e.g. store.reset()). The effect deps [cached, store]
    // don't change on reset, so we need an explicit subscription to detect it.
    let unsubscribeResetWatch: (() => void) | undefined;
    if (autoRefreshConfigured) {
      let prevStatus = cached.get().status;
      unsubscribeResetWatch = store.subscribe(() => {
        const currentStatus = cached.get().status;
        if (currentStatus === 'idle' && prevStatus !== 'idle') {
          cached.startAutoRefresh();
        }
        prevStatus = currentStatus;
      });
    }

    return () => {
      unsubscribeResetWatch?.();
      const latest = cachedRefCounts.get(cached);
      if (!latest) {
        return;
      }
      const newCount = latest.refCount - 1;
      if (newCount <= 0) {
        cachedRefCounts.delete(cached);
        cached.stopAutoRefresh();
      } else {
        cachedRefCounts.set(cached, {
          refCount: newCount,
          autoRefreshConfigured: latest.autoRefreshConfigured,
        });
      }
    };
  }, [cached, store]);

  // ── Subscription ─────────────────────────────────────────────────────────

  const sel = (): TSlice => {
    // cached.get() returns CachedState<unknown> at runtime. TStateAtPath is
    // ValueAtPath<…, TPath>, which the CachedPathsOf constraint guarantees is a
    // CachedState<T> — structurally identical but TypeScript can't prove it, so we assert.
    const state = cached.get() as unknown as TStateAtPath;
    const data = getCachedData(state as CachedState<CachedValueOf<TStateAtPath>>);
    // Without a selector, TSlice defaults to TStateAtPath. The second cast bridges
    // the fact that TypeScript can't automatically collapse the default into TSlice.
    return select ? select(state, data) : (state as unknown as TSlice);
  };

  const cachedValue = useRef<TSlice>(sel());

  const subscribe = (listener: () => void): (() => void) =>
    store.subscribe(() => {
      const next = sel();
      if (!equals(cachedValue.current, next)) {
        cachedValue.current = next;
        listener();
      }
    });

  const getSnapshot = (): TSlice => {
    const next = sel();
    if (equals(cachedValue.current, next)) {
      return cachedValue.current;
    }
    cachedValue.current = next;
    return next;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
