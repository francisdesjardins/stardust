import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import type { DomainStore, StoreContract, UnwrapContext } from '@stardust/core';
import type { UseStoreOptions } from './use-store';
import { useStoreCore } from './use-store';

// ── Type helpers ──────────────────────────────────────────────────────────────

type WithInitial<TInitial> = TInitial extends void
  ? { initial?: undefined }
  : { initial: TInitial };

type WithContext<TContext> = [UnwrapContext<TContext>] extends [never]
  ? { context?: undefined }
  : { context: UnwrapContext<TContext> };

type ProviderProps<TInitial, TContext> = WithInitial<TInitial> &
  WithContext<TContext> & { children: ReactNode };

// ── Public types ──────────────────────────────────────────────────────────────

export type CreateStoreContextOptions<
  TSnapshot,
  TMethods extends Record<string, unknown>,
  TContext = never,
> = {
  /**
   * Display name for React DevTools.
   * Defaults to `'StoreContext'`.
   */
  readonly name?: string | undefined;
  /**
   * Called when the Provider unmounts.
   * Defaults to `null` (no-op) — the store is garbage-collected with the Provider.
   * Pass a function to run explicit teardown (e.g. cancel timers, reset state).
   *
   * Avoid `store.reset()` here: if a user-defined domain method named `reset` exists
   * it will shadow the built-in baseline restore and produce unexpected behavior in
   * React StrictMode's double-mount cycle.
   */
  readonly onUnmount?:
    | ((store: DomainStore<TSnapshot, TMethods, TContext>) => void)
    | null
    | undefined;
};

export type StoreContextResult<
  TSnapshot,
  TMethods extends Record<string, unknown>,
  TContext = never,
  TInitial = void,
> = {
  /** Wraps a subtree with its own transient store instance. */
  readonly Provider: FC<ProviderProps<TInitial, TContext>>;

  /** Returns the store instance. Use for calling methods or non-reactive reads. */
  readonly useStoreContext: () => DomainStore<TSnapshot, TMethods, TContext>;

  /**
   * Subscribes to the store snapshot.
   *
   * The selector receives both the snapshot and the full store as arguments,
   * giving access to domain methods without a separate `useStoreContext` call.
   *
   * ```ts
   * // Full snapshot
   * const snap = useSnapshot();
   *
   * // Selected slice — re-renders only when the result changes
   * const count = useSnapshot((s) => s.count);
   *
   * // Domain method via store second argument
   * const total = useSnapshot((_s, store) => store.getTotal());
   *
   * // Custom equality — for selectors returning new object refs
   * const pos = useSnapshot((s) => ({ x: s.x, y: s.y }), shallowEqual);
   * ```
   */
  readonly useSnapshot: {
    (): TSnapshot;
    <TSlice>(
      selector: (snapshot: TSnapshot, store: DomainStore<TSnapshot, TMethods, TContext>) => TSlice,
      equals?: (a: TSlice, b: TSlice) => boolean
    ): TSlice;
  };
};

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Creates a React context bound to a Stardust store.
 * Each `Provider` mount creates its own store instance and destroys it on unmount.
 *
 * @param factory   Called once per Provider mount. Receives `initial` props
 *                  (omit the prop when `TInitial = void`).
 * @param options   Optional name (DevTools) and `onUnmount` teardown hook.
 *
 * @example
 * ```tsx
 * const CounterCtx = createStoreContext(
 *   (initial: { count: number }) =>
 *     createStore(initial, ({ update }) => ({
 *       increment: () => update((d) => { d.count += 1; }),
 *     })),
 *   { name: 'Counter' },
 * );
 *
 * // Mount — creates a fresh store; resets it when the Provider unmounts
 * <CounterCtx.Provider initial={{ count: 0 }}>
 *   <Counter />
 * </CounterCtx.Provider>
 *
 * // Consume — inside any descendant
 * function Counter() {
 *   const store = CounterCtx.useStoreContext();                      // stable store ref
 *   const count = CounterCtx.useSnapshot((s) => s.count);           // reactive slice
 *   const total = CounterCtx.useSnapshot((s, store) => store.getTotal()); // domain method
 *   return <button onClick={store.increment}>{count}</button>;
 * }
 * ```
 *
 * @example With context injection
 * ```tsx
 * const UserCtx = createStoreContext(
 *   (): UserStore => createStore<UserState, UserMethods, ApiClient>(...),
 * );
 *
 * <UserCtx.Provider context={apiClient}>
 *   <UserProfile />
 * </UserCtx.Provider>
 * ```
 */
function createStoreContext<
  TSnapshot,
  TMethods extends Record<string, unknown>,
  TContext = never,
  TInitial = void,
>(
  factory: (initial: TInitial) => DomainStore<TSnapshot, TMethods, TContext>,
  options?: CreateStoreContextOptions<TSnapshot, TMethods, TContext>
): StoreContextResult<TSnapshot, TMethods, TContext, TInitial> {
  const { name = 'StoreContext', onUnmount = null } = options ?? {};

  type S = DomainStore<TSnapshot, TMethods, TContext>;

  const Context = createContext<S | null>(null);

  // ── Provider ──────────────────────────────────────────────────────────────

  const Provider: FC<ProviderProps<TInitial, TContext>> = ({ children, initial, context }) => {
    // useState lazy initializer — runs once on mount; stable for Provider lifetime.
    const [store] = useState<S>(() => factory(initial as TInitial));

    // Synchronous context injection — mirrors the pattern in useStore({ context }).
    // setContext is a plain setter with no render-triggering side effects.
    if (context !== undefined) {
      store.setContext(context);
    }

    // Cleanup on unmount. store is stable so this effect runs exactly once.
    useEffect(() => {
      if (onUnmount === null) {
        return;
      }
      return () => {
        onUnmount(store);
      };
    }, [store]);

    return <Context.Provider value={store}>{children}</Context.Provider>;
  };

  Provider.displayName = `${name}.Provider`;

  // ── useStoreContext ───────────────────────────────────────────────────────

  const useStoreContext = (): S => {
    const store = useContext(Context);
    if (store === null) {
      throw new Error(`[${name}] useStoreContext must be called inside <${name}.Provider>.`);
    }
    return store;
  };

  // ── useSnapshot ───────────────────────────────────────────────────────────────

  function useSnapshot(): TSnapshot;
  function useSnapshot<TSlice>(
    selector: (snapshot: TSnapshot, store: S) => TSlice,
    equals?: (a: TSlice, b: TSlice) => boolean
  ): TSlice;
  function useSnapshot<TSlice>(
    selector?: (snapshot: TSnapshot, store: S) => TSlice,
    equals?: (a: TSlice, b: TSlice) => boolean
  ): TSnapshot | TSlice {
    const store = useStoreContext();
    // Use useStoreCore (non-overloaded) so DomainStore<TSnapshot, TMethods, TContext>
    // satisfies StoreContractWithOptionalBind structurally — no cast needed.
    // Context is already injected synchronously in Provider; no need to re-pass it.
    const opts: UseStoreOptions<TSnapshot, TSlice, never, S> = { select: selector, equals };
    // Cast opts to drop TStore — useStoreCore calls select(snapshot, store) with the
    // actual S instance at runtime, which satisfies the selector's S parameter.
    return useStoreCore(
      store as StoreContract<TSnapshot>,
      opts as UseStoreOptions<TSnapshot, TSlice, never>
    );
  }

  return { Provider, useStoreContext, useSnapshot };
}

export { createStoreContext };
