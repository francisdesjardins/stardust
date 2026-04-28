import { useRef, useSyncExternalStore } from 'react';
import type { StoreContract, UnwrapContext } from '@stardust/core';

// ── Internal contracts ────────────────────────────────────────────────────────
// These are implementation details of useStore — not re-exported from the barrel.

/** @internal */
type StoreContractWithOptionalBind<TSnapshot> = StoreContract<TSnapshot> & {
  setContext?: (ctx: unknown) => void;
};

/** @internal */
type ContextStoreContract<TSnapshot, TContext> = StoreContract<TSnapshot> & {
  readonly setContext: (ctx: UnwrapContext<TContext>) => void;
};

function identity<T>(x: T): T {
  return x;
}

// ── Options ──────────────────────────────────────────────────────────────────

/**
 * Options for the second argument of `useStore`.
 *
 * - `select`  — selector function; component re-renders only when the
 *               selected value changes under `Object.is` (or `equals`).
 * - `context` — readonly context injected into the store via `setContext`
 *               before subscription. Accessible inside store methods via
 *               `getContext()`. Changes to context identity do **not**
 *               trigger re-renders.
 * - `equals`  — custom equality for the selected slice. Defaults to
 *               `Object.is`. Use `shallowEqual` when `select` returns a
 *               new object literal on every call.
 */
export type UseStoreOptions<TSnapshot, TSlice, TContext> = {
  readonly select?: ((snapshot: TSnapshot) => TSlice) | undefined;
  readonly context?: UnwrapContext<TContext> | undefined;
  readonly equals?: ((a: TSlice, b: TSlice) => boolean) | undefined;
};

// ── Overloads ─────────────────────────────────────────────────────────────────

/**
 * React hook to subscribe to a Stardust store and select state slices with full type safety.
 *
 * Supports three ergonomic forms:
 *
 * 1. **Full snapshot**: `useStore(store)` — re-renders on any store update.
 * 2. **Selector shorthand**: `useStore(store, select)` — re-renders only when the selected value changes (by `Object.is` or custom `equals`).
 * 3. **Options object**: `useStore(store, { select, context, equals })` — combine selector, context injection, and custom equality.
 *
 * - Context is injected before subscription and available in store methods via `getContext()`.
 * - Selectors that return new object references on every call should use `equals: shallowEqual` to avoid unnecessary re-renders.
 * - Changing context identity does **not** trigger a re-render; context is treated as stable for the lifetime of the subscription.
 *
 * @template TSnapshot - Store snapshot type.
 * @template TSlice - Selected slice type.
 * @template TContext - Context type (if used).
 *
 * @param store - The Stardust store instance.
 * @returns The selected state slice (or full snapshot).
 *
 * @example <caption>Full snapshot (re-renders on any change)</caption>
 * const snap = useStore(counterStore);
 *
 * @example <caption>Selector shorthand (re-renders only when count changes)</caption>
 * const count = useStore(counterStore, s => s.count);
 *
 * @example <caption>Context injection</caption>
 * const snap = useStore(store, { context: apiClient });
 *
 * @example <caption>Selector + context + custom equality</caption>
 * const slice = useStore(store, {
 *   select: s => ({ x: s.x, y: s.y }),
 *   context: apiClient,
 *   equals: shallowEqual,
 * });
 */
// Overload 1 — no options
export function useStore<TSnapshot>(store: StoreContract<TSnapshot>): TSnapshot;
// Overload 2 — selector shorthand (no context, no custom equality)
export function useStore<TSnapshot, TSlice>(
  store: StoreContract<TSnapshot>,
  select: (snapshot: TSnapshot) => TSlice
): TSlice;
// Overload 3 must precede overload 4 — guards context-only calls from matching the full-options overload.
// Uses plain TContext (not UnwrapContext<TContext>) so TypeScript can infer TContext
// directly from options.context without going through a conditional type.
// `select?: undefined` prevents this overload from matching calls that pass a selector.
export function useStore<TSnapshot, TContext>(
  store: {
    readonly subscribe: (listener: () => void) => () => void;
    readonly getSnapshot: () => TSnapshot;
    readonly setContext: (ctx: TContext) => void;
  },
  options: {
    readonly context: TContext;
    readonly select?: undefined;
    readonly equals?: ((a: TSnapshot, b: TSnapshot) => boolean) | undefined;
  }
): TSnapshot;
// Overload 4 — options object (select + context + equals, all optional)
export function useStore<TSnapshot, TSlice, TContext>(
  store: ContextStoreContract<TSnapshot, UnwrapContext<TContext>>,
  options: UseStoreOptions<TSnapshot, TSlice, TContext>
): TSlice extends undefined ? TSnapshot : TSlice;
export function useStore<TSnapshot, TSlice>(
  store: StoreContractWithOptionalBind<TSnapshot>,
  arg2?: ((snapshot: TSnapshot) => TSlice) | UseStoreOptions<TSnapshot, TSlice, unknown>
): TSnapshot | TSlice {
  return useStoreCore(store, arg2);
}

/**
 * Non-overloaded implementation shared by `useStore` and `createStoreContext.useSnapshot`.
 * Accepts the minimal `StoreContractWithOptionalBind` structural contract so that any
 * `Store<TSnapshot, TMethods, TContext>` satisfies it without a cast.
 *
 * @internal
 */
export function useStoreCore<TSnapshot, TSlice>(
  store: StoreContractWithOptionalBind<TSnapshot>,
  arg2?: ((snapshot: TSnapshot) => TSlice) | UseStoreOptions<TSnapshot, TSlice, unknown>
): TSnapshot | TSlice {
  const opts = typeof arg2 === 'function' ? undefined : arg2;
  const select: ((snapshot: TSnapshot) => TSlice) | undefined =
    typeof arg2 === 'function' ? arg2 : opts?.select;
  const ctx = opts?.context;
  const equals = opts?.equals;

  // Bind context synchronously before useSyncExternalStore subscribes.
  if (ctx !== undefined) {
    store.setContext?.(ctx);
  }

  const sel: (snapshot: TSnapshot) => TSnapshot | TSlice = select ?? identity;
  const eq = equals ?? Object.is;

  // Cache the last selected value so getSnapshot returns the same reference
  // when the underlying data hasn't changed. useSyncExternalStore calls
  // getSnapshot multiple times during reconciliation and uses Object.is to
  // detect tearing — returning a new object literal on every call (e.g.
  // select: s => ({ x: s.x })) would trigger an infinite re-render loop
  // (React error #185) without this cache.
  const cache = useRef(sel(store.getSnapshot()));

  const subscribe = (listener: () => void): (() => void) => {
    return store.subscribe(() => {
      const next = sel(store.getSnapshot());
      if (!eq(cache.current, next)) {
        cache.current = next;
        listener();
      }
    });
  };

  const getSnapshot = (): TSnapshot | TSlice => {
    const next = sel(store.getSnapshot());
    if (eq(cache.current, next)) {
      return cache.current;
    }
    cache.current = next;
    return cache.current;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
