import type { PathsOf, ValueAtPath } from './path-utils';
import { copyOnWritePath, getAtPath, parsePath } from './path-utils';

// ── Subscription plumbing ─────────────────────────────────────────────────────

/**
 * Minimal read-only contract for a store — `subscribe`, `getSnapshot`, and
 * `listenerCount` — the minimum surface required by `useSyncExternalStore`
 * plus observer awareness.
 *
 * Used as a structural bound wherever the full `Store<TSnapshot, TMethods>`
 * is not needed (e.g. `createDerivedStore` sources, `useStore` overloads,
 * `watch`). Any `Store` instance satisfies this interface automatically.
 */
export type StoreContract<TSnapshot> = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TSnapshot;
  /** Number of active listeners. `0` means no component, hook, or watcher is currently subscribed. */
  readonly listenerCount: number;
};

export type StoreSelector<TSnapshot, TSlice> = (snapshot: TSnapshot) => TSlice;

type StoreSubscription<TSnapshot> = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TSnapshot;
  /** Live count of active listeners (`listeners.size`). */
  readonly listenerCount: number;
  /** Replace the snapshot **and** notify all listeners. */
  readonly emit: (nextSnapshot: TSnapshot) => void;
  /** Replace the snapshot reference without notifying listeners. */
  readonly setSnapshot: (nextSnapshot: TSnapshot) => void;
  /** Notify all listeners (call after one or more `setSnapshot` calls). */
  readonly notify: () => void;
};

/**
 * Options shared by `createStoreSubscription` and `createStore`.
 * `context` is only meaningful for `createStore` — it is ignored by
 * `createStoreSubscription`.
 *
 * @param equals - Equality function used to decide whether `emit()` should
 *   skip notification. When `equals(current, next)` returns `true`, the
 *   snapshot is not replaced and listeners are not called. Defaults to
 *   `Object.is`.
 * @param deepClone - Deep-copy function used by `update()` and `reset()` to
 *   produce an isolated draft or baseline. Defaults to `structuredClone`.
 *   Override when your snapshot contains values that `structuredClone` cannot
 *   handle (e.g. class instances, functions) or when you prefer a faster
 *   alternative such as `klona` or `lodash/cloneDeep`.
 * @param context - Initial context value seeded into the store at creation
 *   time. Equivalent to calling `store.setContext(ctx)` immediately after
 *   construction, but avoids a separate call when the context is already
 *   known. Can still be overwritten later via `setContext()`.
 */
export type StoreSubscriptionOptions<TSnapshot, TContext = never> = {
  readonly equals?: ((a: TSnapshot, b: TSnapshot) => boolean) | undefined;
  readonly deepClone?: ((value: TSnapshot) => TSnapshot) | undefined;
  readonly context?: UnwrapContext<TContext>;
};

/**
 * Creates the subscription plumbing required by `useSyncExternalStore`.
 *
 * Returns `{ subscribe, getSnapshot, listenerCount, emit, setSnapshot, notify }`:
 * - `subscribe` — adds a listener and returns an unsubscribe function
 * - `getSnapshot` — returns the current snapshot (immutable reference)
 * - `listenerCount` — live count of active listeners; O(1) read of `listeners.size`
 * - `emit` — replaces the snapshot and notifies all listeners. Skips
 *   notification when the next snapshot is equal to the current one
 *   according to the `equals` function (default: `Object.is`).
 * - `setSnapshot` — replaces the snapshot **without** notifying (for batching)
 * - `notify` — notifies all listeners without changing the snapshot
 *
 * @example
 * const sub = createStoreSubscription<{ count: number }>({ count: 0 });
 *
 * // In a store method:
 * count++;
 * sub.emit({ count });
 *
 * // In a React hook:
 * const snap = useSyncExternalStore(sub.subscribe, sub.getSnapshot, sub.getSnapshot);
 */
export function createStoreSubscription<TSnapshot>(
  initialSnapshot: TSnapshot,
  options?: StoreSubscriptionOptions<TSnapshot>
): StoreSubscription<TSnapshot> {
  let snapshot: TSnapshot = initialSnapshot;
  const listeners = new Set<() => void>();
  const equals = options?.equals ?? Object.is;

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot(): TSnapshot {
      return snapshot;
    },

    get listenerCount(): number {
      return listeners.size;
    },

    emit(nextSnapshot: TSnapshot): void {
      if (equals(snapshot, nextSnapshot)) {
        return;
      }
      snapshot = nextSnapshot;
      notify();
    },

    setSnapshot(nextSnapshot: TSnapshot): void {
      snapshot = nextSnapshot;
    },

    notify,
  };
}

// ── Context helpers ──────────────────────────────────────────────────────────

/**
 * Wraps a context type to signal that the context may not yet be injected
 * when store methods are called. `getContext()` returns `T | undefined`
 * for stores declared with `MaybeContext<T>`, allowing callers to guard
 * with optional chaining or an early return.
 *
 * Use this when context arrives asynchronously — e.g. loaded from an API
 * before being passed to `useStore({ context })` — and store methods may
 * be invoked before the first successful render with context.
 *
 * Stores declared with a plain `TContext` (no wrapper) receive the strict
 * return type: `getContext()` returns `TContext` directly. This is the
 * correct choice when context is always available at the first render that
 * mounts the store.
 *
 * @example
 * // Context always present — getContext() returns ApiClient
 * createStore<State, Methods, ApiClient>(...)
 *
 * // Context may arrive later — getContext() returns ApiClient | undefined
 * createStore<State, Methods, MaybeContext<ApiClient>>(...)
 */
declare const maybeContextBrand: unique symbol;
export type MaybeContext<T> = { readonly [maybeContextBrand]: T };

/** Resolves the actual return type of `getContext()` based on whether
 *  `TContext` is wrapped in `MaybeContext`. */
type GetContextResult<TContext> = TContext extends MaybeContext<infer U> ? U | undefined : TContext;

/**
 * Unwraps `MaybeContext<T>` to `T` for `setContext` and `useStore({ context })`
 * call sites. Plain context types pass through unchanged.
 *
 * This means callers always pass the plain context value — the `MaybeContext`
 * wrapper is only a type-level marker on the store definition, never at call sites.
 *
 * @example
 * // Store declared with MaybeContext — setContext accepts plain ApiClient
 * const store = createStore<State, Methods, MaybeContext<ApiClient>>(...);
 * store.setContext(apiClient); // ✅ accepts ApiClient, not MaybeContext<ApiClient>
 */
export type UnwrapContext<TContext> = TContext extends MaybeContext<infer U> ? U : TContext;

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * API passed to the `methods` builder of `createStore`.
 *
 * - `get()` — returns the current snapshot
 * - `set(next)` — replaces the snapshot and notifies listeners. Accepts
 *   either a new snapshot object or an updater function `(prev) => next`.
 *   Skips notification when the resolved value is equal to the current
 *   snapshot according to the store's `equals` function (default: `Object.is`).
 * - `update(recipe)` — draft-based partial update. Clones the current snapshot
 *   via `structuredClone`, passes the mutable draft to `recipe`, then emits the
 *   result. Equivalent to `set(produce(get(), recipe))`.
 * - `batch(fn)` — groups multiple mutations into a single listener notification.
 * - `reset(next?)` — restores a clean baseline and commits it. Three forms:
 *   - `reset()` — restores the snapshot to the initial value deep-cloned at creation time.
 *   - `reset(newSnapshot)` — commits `newSnapshot` and updates the stored baseline so future
 *     bare `reset()` calls restore to this new value. Deep-clones the value for isolation.
 *   - `reset(updater)` — receives a clone of the **current baseline** (not the live snapshot),
 *     returns the next baseline, deep-clones and commits it. Use for partial baseline adjustments
 *     when the full initial shape is not in scope.
 * - `run(actionName, fn)` — executes `fn` under a named action scope. When
 *   `connectDebugLog` is attached, the action name appears in the log instead of the
 *   "Untracked store mutation" warning. Use this in `watch` callbacks or other external
 *   code that mutates the store outside any domain method.
 * - `getContext()` — returns the readonly context bound via `useStore({ context })`.
 *   Return type depends on `TContext`: plain `TContext` returns `TContext` directly
 *   (context is always present); `MaybeContext<T>` returns `T | undefined` (context
 *   may arrive after the first render). Only available when `TContext` is specified
 *   (defaults to `never`).
 */
export type StoreApi<TSnapshot, TContext = never> = {
  readonly get: () => TSnapshot;
  readonly set: (next: TSnapshot | ((prev: TSnapshot) => TSnapshot)) => void;
  readonly update: (recipe: (draft: TSnapshot) => void) => void;
  readonly getByPath: <P extends PathsOf<TSnapshot>>(path: P) => ValueAtPath<TSnapshot, P>;
  readonly setByPath: <P extends PathsOf<TSnapshot>>(
    path: P,
    value: ValueAtPath<TSnapshot, P>
  ) => void;
  readonly batch: (fn: () => void) => void;
  readonly reset: (next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)) => void;
  readonly run: (actionName: string, fn: () => void) => void;
  readonly getContext: () => GetContextResult<TContext>;
};

/**
 * Stardust store instance: snapshot contract, core methods, and domain API.
 *
 * Combines the minimal subscription contract (`subscribe`, `getSnapshot`,
 * `listenerCount`) with mutation methods (`set`, `update`, `setByPath`, etc.),
 * context binding, and all domain-specific methods under `store.actions`.
 *
 * - Use `setContext(ctx)` to inject a context object (e.g. API client) for use in store methods.
 * - All core methods are documented in {@link StoreApi}.
 * - Domain methods live under `store.actions`.
 *
 * @template TSnapshot - The shape of the store's snapshot (POJO state).
 * @template TMethods - The domain methods returned from your builder's `actions` key.
 * @template TContext - Optional context type (see {@link MaybeContext}).
 *
 * @example <caption>Counter store with domain methods</caption>
 * const counter = createStore({ count: 0 }, ({ update }) => ({
 *   actions: {
 *     increment() { update(d => { d.count += 1; }); },
 *     decrement() { update(d => { d.count -= 1; }); },
 *   },
 * }));
 *
 * counter.actions.increment();
 * counter.actions.decrement();
 *
 * @example <caption>Injecting context (API client)</caption>
 * type Ctx = { api: ApiClient };
 * const store = createStore<State, Methods, Ctx>(initial, (api) => ({
 *   actions: {
 *     async load() {
 *       const data = await api.getContext().api.fetch();
 *       api.set({ ...api.get(), data });
 *     },
 *   },
 * }));
 * store.setContext({ api: myApiClient });
 */
export type Store<TSnapshot, TMethods, TContext = never> = {
  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Get the current snapshot (POJO state). */
  readonly getSnapshot: () => TSnapshot;
  /** Number of active listeners. `0` means no component, hook, or watcher is currently subscribed. */
  readonly listenerCount: number;
  /** Replace the snapshot and notify listeners. Accepts a new value or updater function. */
  readonly set: (next: TSnapshot | ((prev: TSnapshot) => TSnapshot)) => void;
  /** Draft-based partial update: clones, mutates, and emits if changed. */
  readonly update: (recipe: (draft: TSnapshot) => void) => void;
  /** Get a value at a typed path (dot/bracket notation). */
  readonly getByPath: <P extends PathsOf<TSnapshot>>(path: P) => ValueAtPath<TSnapshot, P>;
  /** Set a value at a typed path (structural sharing, shallow copies along the path). */
  readonly setByPath: <P extends PathsOf<TSnapshot>>(
    path: P,
    value: ValueAtPath<TSnapshot, P>
  ) => void;
  /** Batch multiple mutations into a single notification. */
  readonly batch: (fn: () => void) => void;
  /** Reset the snapshot to the initial or a new baseline. */
  readonly reset: (next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)) => void;
  /**
   * Execute `fn` under a named action scope. When `connectDebugLog` is attached,
   * the action name appears in the log. Use in `watch` callbacks or any external
   * code that mutates the store outside a domain method.
   */
  readonly run: (actionName: string, fn: () => void) => void;
  /** Inject a context object for use in store methods. */
  readonly setContext: (ctx: UnwrapContext<TContext>) => void;
  /** Domain methods returned from the builder. */
  readonly actions: TMethods;
};

/**
 * A store created without an actions builder — exposes built-ins only.
 * `store.actions` is not present on this type.
 */
export type ActionlessStore<TSnapshot, TContext = never> = Omit<
  Store<TSnapshot, Record<never, never>, TContext>,
  'actions'
>;

/**
 * Creates a domain-specific store backed by `createStoreSubscription`.
 *
 * ## POJO contract
 *
 * The **snapshot** (`initialSnapshot` and every value passed to `set()`)
 * must be a plain-old JavaScript object — it must survive
 * `structuredClone()`. Functions, DOM nodes, class instances with
 * non-transferable internal slots, and symbols are **not supported** as
 * snapshot values and will throw at runtime.
 *
 * **Methods are not state.** The `methods` builder receives `{ get, set, update }`
 * and returns an object of domain methods. These methods live on the store
 * instance but are **not** part of the snapshot — they are never cloned,
 * serialized, or compared. Non-snapshot mutable state (handler registries,
 * resolver lists, RAF ids) can live as closure variables inside the builder.
 *
 * `set()` automatically replaces the snapshot and notifies all listeners —
 * callers never need to call `emit()` or define a `notify()` helper.
 *
 * ## Performance
 *
 * - `set()` and `setByPath()` skip notification when the resolved value
 *   is equal to the current one (via `equals`, default `Object.is`) —
 *   no copy, no listener fan-out.
 * - `setByPath` uses **structural sharing** (shallow copies along the
 *   mutation path). Only changed branches get new references; unchanged
 *   subtrees share identity with the previous snapshot.
 * - `update()` uses `structuredClone` for arbitrary draft-based mutation.
 * - `reset()` (bare) deep-clones the stored baseline — same cost as
 *   `structuredClone` on the initial snapshot shape.
 * - `reset(newSnapshot)` / `reset(updater)` deep-clones twice: once to
 *   store the new baseline, once to commit the live snapshot.
 * - `batch(fn)` defers listener notification until `fn` completes,
 *   coalescing multiple mutations into a single re-render.
 *
 * ## Usage with React
 *
 * Use `useStore` from `@stardust/react` to subscribe from React with optional slice selectors:
 *
 * ```ts
 * const count = useStore(counter, (s) => s.count);
 * ```
 *
 * @param options - Optional configuration.
 * @param options.equals - Equality function used by `set()`, `setByPath()`,
 *   and `emit()` to skip notification when the new snapshot is equal to the
 *   current one. Defaults to `Object.is`.
 *
 * @example
 * // Built-ins only — no domain methods needed
 * const store = createStore({ count: 0 });
 * store.set({ count: 1 });
 *
 * @example
 * const counter = createStore({ count: 0 }, ({ update }) => ({
 *   actions: {
 *     increment() { update(draft => { draft.count += 1; }); },
 *     decrement() { update(draft => { draft.count -= 1; }); },
 *   },
 * }));
 */
export function createStore<TSnapshot, TContext = never>(
  initialSnapshot: TSnapshot,
  options?: StoreSubscriptionOptions<TSnapshot, TContext>
): ActionlessStore<TSnapshot, TContext>;
export function createStore<TSnapshot, TMethods extends Record<string, unknown>, TContext = never>(
  initialSnapshot: TSnapshot,
  methods: (api: StoreApi<TSnapshot, TContext>) => { readonly actions: TMethods },
  options?: StoreSubscriptionOptions<TSnapshot, TContext>
): Store<TSnapshot, TMethods, TContext>;
export function createStore<
  TSnapshot,
  TMethods extends Record<string, unknown> = Record<never, never>,
  TContext = never,
>(
  initialSnapshot: TSnapshot,
  methodsOrOptions?: unknown,
  options?: StoreSubscriptionOptions<TSnapshot, TContext>
): Store<TSnapshot, TMethods, TContext> | ActionlessStore<TSnapshot, TContext> {
  const methods =
    typeof methodsOrOptions === 'function'
      ? (methodsOrOptions as (api: StoreApi<TSnapshot, TContext>) => { readonly actions: TMethods })
      : undefined;
  const resolvedOptions: StoreSubscriptionOptions<TSnapshot, TContext> | undefined =
    typeof methodsOrOptions === 'function'
      ? options
      : (methodsOrOptions as StoreSubscriptionOptions<TSnapshot, TContext> | undefined);
  const clone: (value: TSnapshot) => TSnapshot = resolvedOptions?.deepClone ?? structuredClone;
  let resetSnapshot = clone(initialSnapshot);
  const sub = createStoreSubscription(
    initialSnapshot,
    resolvedOptions && { equals: resolvedOptions.equals, deepClone: resolvedOptions.deepClone }
  );
  const equals = resolvedOptions?.equals ?? Object.is;

  // ── Context slot ─────────────────────────────────────────────────────────
  // Mutable cell written by useStore({ context }) before any method is called.
  // Methods are always invoked from event handlers (post-commit), never during
  // render, so the slot is always populated by the time getContext() runs.
  const contextCell = { value: resolvedOptions?.context as TContext | undefined };

  function getContext(): GetContextResult<TContext> {
    // The conditional type GetContextResult<TContext> resolves to either
    // TContext (plain context, always defined) or T | undefined (MaybeContext<T>).
    // The runtime always returns TContext | undefined; the type contract is
    // enforced at the call site by the conditional — safe to cast here.
    return contextCell.value as GetContextResult<TContext>;
  }

  // ── Batching ────────────────────────────────────────────────────────────
  let batchDepth = 0;
  let pendingNotify = false;

  function commit(next: TSnapshot): void {
    sub.setSnapshot(next);
    if (batchDepth > 0) {
      pendingNotify = true;
    } else {
      sub.notify();
    }
  }

  function batch(fn: () => void): void {
    batchDepth++;
    try {
      fn();
    } finally {
      batchDepth--;
      if (batchDepth === 0 && pendingNotify) {
        pendingNotify = false;
        sub.notify();
      }
    }
  }

  // ── Core mutations ──────────────────────────────────────────────────────

  function update(recipe: (draft: TSnapshot) => void): void {
    const prev = sub.getSnapshot();
    const draft = clone(prev);
    recipe(draft);
    if (equals(prev, draft)) {
      return;
    }
    commit(draft);
  }

  function set(next: TSnapshot | ((prev: TSnapshot) => TSnapshot)): void {
    const resolved =
      typeof next === 'function'
        ? (next as (prev: TSnapshot) => TSnapshot)(sub.getSnapshot())
        : next;
    if (equals(resolved, sub.getSnapshot())) {
      return;
    }
    commit(resolved);
  }

  function getByPath<P extends PathsOf<TSnapshot>>(path: P): ValueAtPath<TSnapshot, P> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return -- runtime path traversal, enforced via PathsOf/ValueAtPath
    return getAtPath(sub.getSnapshot(), parsePath(path)) as any;
  }

  function setByPath<P extends PathsOf<TSnapshot>>(
    path: P,
    value: ValueAtPath<TSnapshot, P>
  ): void {
    const segments = parsePath(path);
    // Skip when the value is already identical — avoids copy + notification.
    if (getAtPath(sub.getSnapshot(), segments) === value) {
      return;
    }
    // Structural sharing: shallow-copy only the nodes on the mutation path.
    const next = copyOnWritePath(sub.getSnapshot(), segments, value);
    commit(next);
  }

  function reset(next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)): void {
    if (next === undefined) {
      commit(clone(resetSnapshot));
      return;
    }
    const resolved =
      typeof next === 'function'
        ? (next as (initial: TSnapshot) => TSnapshot)(clone(resetSnapshot))
        : next;
    // Update the baseline so future bare reset() calls restore to this value.
    resetSnapshot = clone(resolved);
    commit(resolved);
  }

  // ── Store object ─────────────────────────────────────────────────────────
  // Built before the api so domain methods can call through it. Any wrapper
  // applied to store.update / store.set from outside (e.g. connectDebugLog)
  // is therefore visible to domain methods — including async continuations.

  function run(_actionName: string, fn: () => void): void {
    fn();
  }

  const store = {
    subscribe: sub.subscribe,
    getSnapshot: sub.getSnapshot,
    get listenerCount(): number {
      return sub.listenerCount;
    },
    set,
    update,
    getByPath,
    setByPath,
    batch,
    reset,
    run,
    setContext(ctx: UnwrapContext<TContext>): void {
      contextCell.value = ctx as TContext | undefined;
    },
  } as Store<TSnapshot, TMethods, TContext>;

  // ── Forwarding api ────────────────────────────────────────────────────────
  // Domain methods receive this api. Each method forwards through `store` so
  // external wrappers on store.update / store.set are picked up at call time.

  const api: StoreApi<TSnapshot, TContext> = {
    get: sub.getSnapshot,
    set: (next) => {
      store.set(next);
    },
    update: (recipe) => {
      store.update(recipe);
    },
    getByPath: (path) => store.getByPath(path),
    setByPath: (path, value) => {
      store.setByPath(path, value);
    },
    batch: (fn) => {
      store.batch(fn);
    },
    reset,
    run: (actionName, fn) => {
      store.run(actionName, fn);
    },
    getContext,
  };

  if (methods) {
    (store as unknown as { actions: TMethods }).actions = methods(api).actions;
  }

  return store;
}
