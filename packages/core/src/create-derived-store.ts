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
 * Read-only Stardust store for derived/computed state.
 *
 * Exposes only the `subscribe` and `getSnapshot` methods (no mutation or context methods).
 * Returned by `createDerivedStore` for computed projections across one or more source stores.
 *
 * @template TResult The shape of the derived snapshot.
 *
 * @see createDerivedStore
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
 * Creates a read-only derived store that recomputes automatically whenever any source store changes.
 *
 * - Computes its value from one or more source stores using a pure derive function.
 * - Notifies subscribers only when the derived value actually changes (using `Object.is` or a custom equality function).
 * - Subscribes to source stores only while it has active listeners (zero overhead when unused).
 *
 * @template TSources Tuple of source stores (must be at least one).
 * @template TResult The shape of the derived snapshot.
 *
 * @param sources - Array/tuple of source stores to derive from.
 * @param derive - Pure function that computes the derived value from source snapshots.
 * @param [options] - Optional: custom equality function for the derived value.
 *
 * @returns A read-only derived store (see {@link DerivedStore}).
 *
 * @example <caption>Object result (use shallowEqual)</caption>
 * const summary = createDerivedStore(
 *   [countStore, labelStore],
 *   (c, l) => ({ doubled: c.count * 2, upper: l.label.toUpperCase() }),
 *   { equals: shallowEqual },
 * );
 *
 * @example <caption>Primitive result (default Object.is)</caption>
 * const isPositive = createDerivedStore(
 *   [countStore],
 *   (c) => c.count > 0,
 * );
 *
 * @example <caption>Works with useStore</caption>
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
