import { useSyncExternalStore } from 'react';
import type { AsyncState } from '@stardust/core';
import type { StoreContract, UnwrapContext } from '@stardust/core';

// ── Pending promise registry ──────────────────────────────────────────────────
// WeakMap keyed by store instance. Entries are removed when the store emits
// any update (i.e. the async operation settled), so the next pending transition
// creates a fresh Promise. No memory leak: WeakMap releases entries when the
// store is GC'd.
const pendingPromises = new WeakMap<object, Promise<void>>();

function getOrCreatePendingPromise(
  store: Pick<StoreContract<unknown>, 'subscribe'>
): Promise<void> {
  const cached = pendingPromises.get(store);
  if (cached !== undefined) {
    return cached;
  }

  // Promise.withResolvers() (ES2024) — resolve handle is available before the
  // subscribe callback is declared, eliminating the temporal-dependency between
  // the Promise executor and the unsubscribe reference.
  const { promise, resolve } = Promise.withResolvers<void>();
  const unsubscribe = store.subscribe(() => {
    pendingPromises.delete(store);
    unsubscribe();
    resolve();
  });

  pendingPromises.set(store, promise);
  return promise;
}

// ── Internal types ────────────────────────────────────────────────────────────

/** @internal */
type SuspenseStoreContract<TSnapshot> = StoreContract<TSnapshot> & {
  setContext?: (ctx: unknown) => void;
};

// ── useSuspenseStore ──────────────────────────────────────────────────────────

/**
 * React Suspense hook for async Stardust store fields.
 *
 * Subscribes to an `AsyncState<T>` field in a Stardust store and returns the resolved value, throwing a Promise or Error as required by the React Suspense protocol.
 *
 * - `fulfilled`: returns the value
 * - `rejected`: throws the error (caught by `<ErrorBoundary>`)
 * - `idle`/`pending`: throws a Promise (caught by `<Suspense>`, triggers fallback)
 *
 * Context can be injected via the third argument for stores that require it.
 *
 * @template TSnapshot - Store snapshot type.
 * @template T - Async value type.
 * @template TContext - Context type (if used).
 *
 * @param store - The Stardust store instance.
 * @param select - Selector for the `AsyncState<T>` field.
 * @returns The resolved value, or throws as required by Suspense.
 *
 * @example <caption>Basic usage with Suspense and ErrorBoundary</caption>
 * function UserProfile() {
 *   const user = useSuspenseStore(userStore, s => s.user);
 *   return <div>{user.name}</div>;
 * }
 *
 * @example <caption>With context injection</caption>
 * function UserProfile() {
 *   const user = useSuspenseStore(userStore, s => s.user, { context: apiClient });
 *   return <div>{user.name}</div>;
 * }
 *
 * @example <caption>Mount site</caption>
 * <ErrorBoundary fallback={<p>Error</p>}>
 *   <Suspense fallback={<p>Loading…</p>}>
 *     <UserProfile />
 *   </Suspense>
 * </ErrorBoundary>
 */
// Overload 1 — no context
export function useSuspenseStore<TSnapshot, T>(
  store: StoreContract<TSnapshot>,
  select: (snapshot: TSnapshot) => AsyncState<T>
): T;
// Overload 2 — with context injection
export function useSuspenseStore<TSnapshot, T, TContext>(
  store: StoreContract<TSnapshot> & {
    readonly setContext: (ctx: UnwrapContext<TContext>) => void;
  },
  select: (snapshot: TSnapshot) => AsyncState<T>,
  options: { readonly context: UnwrapContext<TContext> }
): T;
// Implementation
export function useSuspenseStore<TSnapshot, T>(
  store: SuspenseStoreContract<TSnapshot>,
  select: (snapshot: TSnapshot) => AsyncState<T>,
  options?: { readonly context?: unknown }
): T {
  if (options?.context !== undefined) {
    store.setContext?.(options.context);
  }

  const state = useSyncExternalStore(store.subscribe, () => select(store.getSnapshot()));

  if (state.status === 'fulfilled') {
    return state.data;
  }
  if (state.status === 'rejected') {
    throw state.error;
  }

  // idle or pending — suspend until the store emits its next update
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- Suspense protocol requires throwing a Promise
  throw getOrCreatePendingPromise(store);
}
