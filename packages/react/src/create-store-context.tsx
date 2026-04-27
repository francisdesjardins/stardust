import { createContext, useContext, useEffect, useState, type FC, type ReactNode } from 'react';
import type { Store, StoreContract, UnwrapContext } from '@stardust/core';
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
   * Defaults to `store.reset()`.
   * Pass `null` to opt out of cleanup entirely.
   */
  readonly cleanup?: ((store: Store<TSnapshot, TMethods, TContext>) => void) | null | undefined;
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
  readonly useStoreContext: () => Store<TSnapshot, TMethods, TContext>;

  /**
   * Subscribes to the store snapshot.
   *
   * ```ts
   * // Full snapshot
   * const snap = useSnapshot();
   *
   * // Selected slice — re-renders only when the result changes
   * const count = useSnapshot((s) => s.count);
   *
   * // Custom equality — for selectors returning new object refs
   * const pos = useSnapshot((s) => ({ x: s.x, y: s.y }), shallowEqual);
   * ```
   */
  readonly useSnapshot: {
    (): TSnapshot;
    <TSlice>(
      selector: (s: TSnapshot) => TSlice,
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
 * @param options   Optional name (DevTools) and cleanup override.
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
 *   const store = CounterCtx.useStoreContext();           // stable store ref
 *   const count = CounterCtx.useSnapshot((s) => s.count);    // reactive slice
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
  factory: (initial: TInitial) => Store<TSnapshot, TMethods, TContext>,
  options?: CreateStoreContextOptions<TSnapshot, TMethods, TContext>
): StoreContextResult<TSnapshot, TMethods, TContext, TInitial> {
  const {
    name = 'StoreContext',
    cleanup = (store: Store<TSnapshot, TMethods, TContext>) => {
      store.reset();
    },
  } = options ?? {};

  type S = Store<TSnapshot, TMethods, TContext>;

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
      if (cleanup === null) {
        return;
      }
      return () => {
        cleanup(store);
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
    selector: (s: TSnapshot) => TSlice,
    equals?: (a: TSlice, b: TSlice) => boolean
  ): TSlice;
  function useSnapshot<TSlice>(
    selector?: (s: TSnapshot) => TSlice,
    equals?: (a: TSlice, b: TSlice) => boolean
  ): TSnapshot | TSlice {
    const store = useStoreContext();
    // Use useStoreCore (non-overloaded) so Store<TSnapshot, TMethods, TContext>
    // satisfies StoreContractWithOptionalBind structurally — no cast needed.
    // Context is already injected synchronously in Provider; no need to re-pass it.
    const opts: UseStoreOptions<TSnapshot, TSlice, never> = { select: selector, equals };
    // Widen to StoreContract (valid structural upcast — Store IS a StoreContract) so the
    // setContext parameter type doesn't block assignment to StoreContractWithOptionalBind.
    // Context is already injected by Provider; useStoreCore won't call setContext here.
    return useStoreCore(store as StoreContract<TSnapshot>, opts);
  }

  return { Provider, useStoreContext, useSnapshot };
}

export { createStoreContext };
