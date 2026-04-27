import type { StoreContract } from './create-store';
import { createStoreSubscription } from './create-store';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Extracts the snapshot type from each store in a tuple.
 *
 * @example
 * type S = SnapshotsOf<[StoreContract<{ a: number }>, StoreContract<string>]>;
 * //   ^? [{ a: number }, string]
 */
type SnapshotsOf<T extends readonly StoreContract<unknown>[]> = {
  [K in keyof T]: T[K] extends StoreContract<infer S> ? S : never;
};

/**
 * A read-only store — the `subscribe`/`getSnapshot` contract required by
 * `useSyncExternalStore` (and `useStore`). Derived stores have no `set`,
 * `setContext`, or domain methods.
 */
export type DerivedStore<TResult> = StoreContract<TResult>;

/**
 * Options for `createDerivedStore`.
 *
 * @param equals - Equality function used to decide whether to notify
 *   subscribers after recomputation. Defaults to `Object.is`. Use
 *   `shallowEqual` for derive functions that return new object literals
 *   each time to suppress spurious notifications.
 */
export type DerivedStoreOptions<TResult> = {
  readonly equals?: ((a: TResult, b: TResult) => boolean) | undefined;
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a read-only derived store that recomputes automatically whenever
 * any source store changes.
 *
 * The derived snapshot is computed eagerly on creation and recomputed on
 * every source notification. Subscribers are only notified when the new
 * result differs from the previous one according to the `equals` function
 * (default: `Object.is`). Use `shallowEqual` for derives that return new
 * object literals each time.
 *
 * **Lazy subscriptions** — the derived store only subscribes to its sources
 * when its own first listener subscribes, and unsubscribes from all sources
 * when the last listener unsubscribes. This means zero overhead when the
 * derived store is not actively consumed by React.
 *
 * **Derive purity** — the `derive` callback must be a pure function of its
 * snapshot arguments. Never call store methods or `getContext()` inside a
 * derive: those dependencies are invisible to `createDerivedStore` and will
 * not trigger recomputation when they change. Context-dependent work belongs
 * in store methods that write computed results back into the snapshot; the
 * derive then reads those snapshot fields.
 *
 * @example
 * const countStore = createStore({ count: 0 }, ...);
 * const labelStore = createStore({ label: 'hi' }, ...);
 *
 * // Object result — use shallowEqual to prevent spurious re-renders
 * const summary = createDerivedStore(
 *   [countStore, labelStore],
 *   (c, l) => ({ doubled: c.count * 2, upper: l.label.toUpperCase() }),
 *   { equals: shallowEqual },
 * );
 *
 * // Primitive result — default Object.is works well
 * const isPositive = createDerivedStore(
 *   [countStore],
 *   (c) => c.count > 0,
 * );
 *
 * // Works directly with useStore
 * const snap = useStore(summary);
 */
export function createDerivedStore<
  TSources extends readonly [StoreContract<unknown>, ...StoreContract<unknown>[]],
  TResult,
>(
  sources: TSources,
  derive: (...snapshots: SnapshotsOf<TSources>) => TResult,
  options?: DerivedStoreOptions<TResult>
): DerivedStore<TResult> {
  const equals = options?.equals ?? Object.is;

  function compute(): TResult {
    const snapshots = sources.map((s) => s.getSnapshot()) as SnapshotsOf<TSources>;
    return derive(...snapshots);
  }

  const sub = createStoreSubscription(compute());

  // ── Lazy source subscription management ─────────────────────────────────

  let listenerCount = 0;
  const unsubscribes: (() => void)[] = [];

  function recompute(): void {
    const next = compute();
    if (!equals(sub.getSnapshot(), next)) {
      sub.emit(next);
    }
  }

  /** Silent recompute — updates the snapshot without notifying listeners.
   *  Used on first subscribe to catch up on missed changes without
   *  triggering a `useSyncExternalStore` tear-detection loop. */
  function syncSnapshot(): void {
    const next = compute();
    if (!equals(sub.getSnapshot(), next)) {
      sub.setSnapshot(next);
    }
  }

  function subscribeToSources(): void {
    for (const source of sources) {
      unsubscribes.push(source.subscribe(recompute));
    }
  }

  function unsubscribeFromSources(): void {
    for (const unsub of unsubscribes) {
      unsub();
    }
    unsubscribes.length = 0;
  }

  return {
    subscribe(listener: () => void): () => void {
      if (listenerCount === 0) {
        // Silently catch up on changes that occurred while the derived
        // store had no listeners. Uses setSnapshot (not emit) to avoid
        // triggering a useSyncExternalStore tear-detection loop — the
        // listener is not yet subscribed at this point.
        syncSnapshot();
        subscribeToSources();
      }
      listenerCount++;

      const unsub = sub.subscribe(listener);

      return () => {
        unsub();
        listenerCount--;
        if (listenerCount === 0) {
          unsubscribeFromSources();
        }
      };
    },

    getSnapshot(): TResult {
      return sub.getSnapshot();
    },
  };
}
