/**
 * @experimental SolidJS adapter for Stardust stores.
 *
 * Requires `solid-js` installed in the consumer's project.
 * Not included in the main library build or barrel exports.
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
