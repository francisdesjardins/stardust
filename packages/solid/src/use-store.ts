/**
 * SolidJS adapter hook for Stardust stores.
 *
 * Provides a reactive signal accessor for a Stardust store, integrating with SolidJS reactivity.
 *
 * - Returns a SolidJS signal accessor for the store snapshot or a selected slice.
 * - Re-runs only when the selected value changes (using `Object.is` or a custom equality function).
 * - Cleans up the subscription automatically when the component is disposed.
 * - Selector functions receive both the snapshot and the full store as arguments,
 *   giving access to domain methods without closing over the store variable.
 *
 * @remarks
 * Requires `solid-js` installed in your project. Not included in the main library build or barrel exports.
 *
 * @template TStore The full store type (including domain methods).
 * @template TSlice The selected value type (defaults to the snapshot type).
 *
 * @param store - The Stardust store instance.
 * @param [select] - Optional selector function. Receives the snapshot and the store.
 * @param [equals] - Optional equality function for the selected value (defaults to `Object.is`).
 *
 * @returns A SolidJS signal accessor function for the selected value.
 *
 * @example <caption>Full snapshot (re-runs on every store update)</caption>
 * const snap = useStore(counterStore);
 * console.log(snap().count);
 *
 * @example <caption>Selector (re-runs only when count changes)</caption>
 * const count = useStore(counterStore, (s) => s.count);
 * console.log(count());
 *
 * @example <caption>Selector with domain method via store second argument</caption>
 * const total = useStore(pricingStore, (_s, store) => store.getTotal());
 * console.log(total());
 *
 * @example <caption>Selector with custom equality</caption>
 * import { shallowEqual } from '@stardust/core';
 * const pos = useStore(store, (s) => ({ x: s.x, y: s.y }), shallowEqual);
 * console.log(pos().x, pos().y);
 */
import { createSignal, onCleanup } from 'solid-js';
import type { StoreContract } from '@stardust/core';

export type { StoreContract };

/** Extracts the snapshot type from a StoreContract. */
type SnapshotOf<TStore> = TStore extends StoreContract<infer S> ? S : never;

// Overload 1 — full snapshot, re-runs on every store update
export function useStore<TStore extends StoreContract<unknown>>(
  store: TStore
): () => SnapshotOf<TStore>;
// Overload 2 — selector with optional custom equality.
// TStore is inferred from the store argument; snapshot type is derived via SnapshotOf<TStore>
// so TypeScript doesn't need to infer it through a constraint.
export function useStore<TSlice, TStore extends StoreContract<unknown>>(
  store: TStore,
  select: (snapshot: SnapshotOf<TStore>, store: TStore) => TSlice,
  equals?: (a: TSlice, b: TSlice) => boolean
): () => TSlice;
export function useStore<TSlice, TStore extends StoreContract<unknown>>(
  store: TStore,
  select?: (snapshot: SnapshotOf<TStore>, store: TStore) => TSlice,
  equals?: (a: TSlice, b: TSlice) => boolean
): () => TSlice | SnapshotOf<TStore> {
  const sel = select
    ? (snapshot: SnapshotOf<TStore>) => select(snapshot, store)
    : (x: SnapshotOf<TStore>) => x;
  const eq = equals ?? Object.is;

  const [snapshot, setSnapshot] = createSignal<TSlice | SnapshotOf<TStore>>(
    sel(store.getSnapshot() as SnapshotOf<TStore>),
    { equals: eq as (a: TSlice | SnapshotOf<TStore>, b: TSlice | SnapshotOf<TStore>) => boolean }
  );

  const unsub = store.subscribe(() => {
    setSnapshot(() => sel(store.getSnapshot() as SnapshotOf<TStore>));
  });

  onCleanup(unsub);

  return snapshot;
}
