/**
 * @experimental SolidJS Suspense adapter for Stardust async stores.
 *
 * Requires `solid-js` installed in the consumer's project.
 * Not included in the main library build or barrel exports.
 */
import { createResource } from 'solid-js';
import type { AsyncState } from '@stardust/core';
import type { StoreContract } from '@stardust/core';
import { useStore } from './use-store';

/**
 * SolidJS Suspense adapter for Stardust async stores.
 *
 * Subscribes to an `AsyncState<T>` field in a Stardust store and returns a SolidJS resource accessor.
 * Integrates with SolidJS `<Suspense>` and `<ErrorBoundary>` for seamless async data handling.
 *
 * - Returns a resource accessor `() => T` that throws a Promise while loading, or an Error if rejected.
 * - Use inside a component wrapped in `<Suspense>` and `<ErrorBoundary>` for proper async flow.
 * - Handles all `AsyncState` statuses:
 *   - `fulfilled`: returns the value
 *   - `rejected`: throws the error (caught by `<ErrorBoundary>`)
 *   - `idle`/`pending`: throws a Promise (caught by `<Suspense>`, triggers fallback)
 *
 * @remarks
 * Requires `solid-js` installed in your project. Not included in the main library build or barrel exports.
 *
 * @template TSnapshot The store snapshot type.
 * @template T The resolved async value type.
 *
 * @param store - The Stardust store instance.
 * @param select - Selector function to pick the `AsyncState<T>` field from the snapshot.
 *
 * @returns A SolidJS resource accessor function for the resolved value.
 *
 * @example <caption>Basic usage with Suspense and ErrorBoundary</caption>
 * function UserProfile() {
 *   const user = useSuspenseStore(userStore, s => s.user);
 *   return <div>{user().name}</div>;
 * }
 *
 * <ErrorBoundary fallback={e => <p>{e.message}</p>}>
 *   <Suspense fallback={<p>Loading…</p>}>
 *     <UserProfile />
 *   </Suspense>
 * </ErrorBoundary>
 */
export function useSuspenseStore<TSnapshot, T>(
  store: StoreContract<TSnapshot>,
  select: (snapshot: TSnapshot) => AsyncState<T>
): () => T {
  // Track the AsyncState slice as a reactive signal. The signal updates only
  // when the AsyncState reference changes (Object.is equality by default).
  const state = useStore(store, select);

  // createResource re-runs the fetcher whenever `state` (the source) changes.
  // — fulfilled → resolves immediately with the data
  // — rejected  → rejects, ErrorBoundary catches the thrown error
  // — idle/pending → returns a never-resolving Promise so Suspense waits;
  //   when the store emits the next update the source signal changes and
  //   createResource re-fetches with the new AsyncState.
  const [resource] = createResource(state, (asyncState): Promise<T> => {
    if (asyncState.status === 'fulfilled') {
      return Promise.resolve(asyncState.data);
    }
    if (asyncState.status === 'rejected') {
      return Promise.reject(asyncState.error);
    }
    return new Promise<T>(() => {});
  });

  return () => {
    const value = resource();
    if (value === undefined) {
      throw new Error('[useSuspenseStore] resource not ready — wrap the component in <Suspense>');
    }

    return value;
  };
}
