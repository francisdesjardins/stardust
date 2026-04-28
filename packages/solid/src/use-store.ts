/**
 * SolidJS adapter hook for Stardust stores.
 *
 * Provides a reactive signal accessor for a Stardust store, integrating with SolidJS reactivity.
 *
 * - Returns a SolidJS signal accessor for the store snapshot or a selected slice.
 * - Re-runs only when the selected value changes (using `Object.is` or a custom equality function).
 * - Cleans up the subscription automatically when the component is disposed.
 *
 * @remarks
 * Requires `solid-js` installed in your project. Not included in the main library build or barrel exports.
 *
 * @template T The store snapshot type.
 * @template S The selected value type (defaults to T).
 *
 * @param store - The Stardust store instance.
 * @param [select] - Optional selector function to pick a slice of the snapshot.
 * @param [equals] - Optional equality function for the selected value (defaults to `Object.is`).
 *
 * @returns A SolidJS signal accessor function for the selected value.
 *
 * @example <caption>Full snapshot (re-runs on every store update)</caption>
 * const snap = useStore(counterStore);
 * console.log(snap().count);
 *
 * @example <caption>Selector (re-runs only when count changes)</caption>
 * const count = useStore(counterStore, s => s.count);
 * console.log(count());
 *
 * @example <caption>Selector with custom equality</caption>
 * import { shallowEqual } from '@stardust/core';
 * const pos = useStore(store, s => ({ x: s.x, y: s.y }), shallowEqual);
 * console.log(pos().x, pos().y);
 */
import { createSignal, onCleanup } from 'solid-js';
import type { StoreContract } from '@stardust/core';

export type { StoreContract };

// Overload 1 — full snapshot, re-runs on every store update
export function useStore<T>(store: StoreContract<T>): () => T;
// Overload 2 — selector with optional custom equality
export function useStore<T, S>(
  store: StoreContract<T>,
  select: (snapshot: T) => S,
  equals?: (a: S, b: S) => boolean
): () => S;
export function useStore<T, S = T>(
  store: StoreContract<T>,
  select?: (snapshot: T) => S,
  equals?: (a: S, b: S) => boolean
): () => S {
  const sel = select ?? ((x: T) => x as unknown as S);
  const eq = equals ?? Object.is;

  const [snapshot, setSnapshot] = createSignal<S>(sel(store.getSnapshot()), {
    equals: eq,
  });

  const unsub = store.subscribe(() => {
    setSnapshot(() => sel(store.getSnapshot()));
  });

  onCleanup(unsub);

  return snapshot;
}
