import type { Store } from './create-store';
import type { PathsOf, ValueAtPath } from './path-utils';

// ── Dispatchable surface ─────────────────────────────────────────────────────

/**
 * Built-in store mutations available through dispatch.
 *
 * These mirror the methods on `Store` that perform reads or writes —
 * excluding subscription plumbing (`subscribe`, `getSnapshot`) and
 * context binding (`setContext`).
 */
export type BuiltinDispatchable<TSnapshot> = {
  readonly set: (next: TSnapshot | ((prev: TSnapshot) => TSnapshot)) => void;
  readonly update: (recipe: (draft: TSnapshot) => void) => void;
  readonly getByPath: <P extends PathsOf<TSnapshot>>(path: P) => ValueAtPath<TSnapshot, P>;
  readonly setByPath: <P extends PathsOf<TSnapshot>>(
    path: P,
    value: ValueAtPath<TSnapshot, P>
  ) => void;
  readonly batch: (fn: () => void) => void;
  readonly reset: (next?: TSnapshot | ((initial: TSnapshot) => TSnapshot)) => void;
};

/**
 * Union of built-in dispatchable methods and domain methods.
 */
export type DispatchableActions<TSnapshot, TMethods> = BuiltinDispatchable<TSnapshot> & TMethods;

// ── Dispatch options ─────────────────────────────────────────────────────────

/**
 * Structured options for `createStoreDispatch` controlling which action
 * categories are dispatchable.
 *
 * - `builtin` — built-in store mutations (`set`, `update`, `getByPath`,
 *   `setByPath`, `batch`, `reset`). Pass an array of keys to allow specific
 *   builtins, or `true` to allow all. Defaults to **none** when omitted.
 *
 * - `domain` — methods from the store's `methods` builder. Pass an array of
 *   keys to allow specific domain methods, or `true` to allow all. Defaults
 *   to **all** when omitted.
 *
 * @example
 * // All builtins + all domain
 * createStoreDispatch(store, { builtin: true });
 *
 * @example
 * // Specific builtins + specific domain methods
 * createStoreDispatch(store, { builtin: ['update'], domain: ['increment'] });
 *
 * @example
 * // No builtins + specific domain methods
 * createStoreDispatch(store, { domain: ['load', 'reset'] });
 */
export type DispatchOptions<
  TSnapshot,
  TMethods extends object,
  TBuiltin extends readonly (keyof BuiltinDispatchable<TSnapshot>)[] | true =
    readonly (keyof BuiltinDispatchable<TSnapshot>)[],
  TDomain extends readonly Extract<keyof TMethods, string>[] | true = true,
> = {
  readonly builtin?: TBuiltin | undefined;
  readonly domain?: TDomain | undefined;
};

/** Resolves the allowed builtin keys from a `DispatchOptions` `builtin` value. */
type ResolveBuiltin<TSnapshot, TBuiltin> = TBuiltin extends true
  ? keyof BuiltinDispatchable<TSnapshot>
  : TBuiltin extends readonly (keyof BuiltinDispatchable<TSnapshot>)[]
    ? TBuiltin[number]
    : never;

/** Resolves the allowed domain keys from a `DispatchOptions` `domain` value. */
type ResolveDomain<TMethods, TDomain> = TDomain extends true
  ? keyof TMethods
  : TDomain extends readonly (keyof TMethods)[]
    ? TDomain[number]
    : never;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts parameters from a function type, falling back to `unknown[]`
 * for generic functions where `Parameters` resolves to `never`.
 */
type SafeParams<T> = T extends (...args: infer A) => unknown
  ? unknown[] extends A
    ? A
    : [A] extends [never]
      ? unknown[]
      : A
  : never;

/**
 * Extracts the return type from a function type, falling back to `unknown`
 * for generic functions where `ReturnType` resolves to `never`.
 */
type SafeReturn<T> = T extends (...args: never[]) => infer R
  ? [R] extends [never]
    ? unknown
    : R
  : never;

/**
 * A dispatch function that routes an action key to the corresponding
 * store method, forwarding arguments and return values.
 *
 * The optional third type parameter `TAllowed` restricts which actions
 * are dispatchable. When omitted, only domain methods are available.
 *
 * Built-in keys (`set`, `update`, `getByPath`, `setByPath`, `batch`)
 * and domain methods from the store's `methods` builder are dispatchable.
 * Return values pass through — async methods work with `await dispatch(...)`.
 *
 * @example
 * // Domain-only dispatch — built-ins not reachable
 * const dispatch = createStoreDispatch(store);
 * dispatch('increment');          // ✅ domain method
 * dispatch('set', next);          // ❌ type error — builtin, not in domain
 *
 * @example
 * // Opt-in builtins via structured options
 * const dispatch = createStoreDispatch(store, { builtin: ['set'], domain: ['increment'] });
 * dispatch('increment');          // ✅
 * dispatch('set', next);          // ✅ opted in
 * dispatch('update', recipe);     // ❌ not listed
 */
export type StoreDispatch<
  TSnapshot,
  TMethods,
  TAllowed extends keyof DispatchableActions<TSnapshot, TMethods> = keyof TMethods,
> = <K extends TAllowed>(
  action: K,
  ...args: SafeParams<DispatchableActions<TSnapshot, TMethods>[K]>
) => SafeReturn<DispatchableActions<TSnapshot, TMethods>[K]>;

// ── Runtime constants ────────────────────────────────────────────────────────

/** Built-in dispatchable keys — typed against `BuiltinDispatchable` so drift is a compile error. */
const BUILTIN_KEYS = [
  'set',
  'update',
  'getByPath',
  'setByPath',
  'batch',
  'reset',
] satisfies readonly (keyof BuiltinDispatchable<never>)[];

/** All non-domain keys on a store object — typed against `Store` so drift is a compile error. */
const NON_DOMAIN_KEYS = new Set([
  'subscribe',
  'getSnapshot',
  'listenerCount',
  'setContext',
  'reset',
  ...BUILTIN_KEYS,
] satisfies readonly (keyof Store<never, Record<never, never>>)[]);

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a dispatch function for a Stardust store (domain methods only by default).
 *
 * - Returns a function that calls store domain methods by name, forwarding arguments and return values.
 * - By default, only domain methods (from the `methods` builder) are dispatchable.
 * - Built-in operations (`set`, `update`, `getByPath`, `setByPath`, `batch`, `reset`) are not reachable unless explicitly opted in via the `options` overload.
 *
 * @template TSnapshot The store snapshot type.
 * @template TMethods The domain methods type.
 * @template TContext The context type (if any).
 *
 * @param store - The Stardust store instance.
 *
 * @returns A dispatch function for domain methods only.
 *
 * @see createStoreDispatch (overload with options) to opt in builtins or restrict domain methods.
 *
 * @example <caption>Domain-only dispatch</caption>
 * const dispatch = createStoreDispatch(store);
 * dispatch('increment'); // ✅ domain method
 * dispatch('set', next); // ❌ type error (not in domain)
 */
export function createStoreDispatch<TSnapshot, TMethods extends object, TContext = never>(
  store: Store<TSnapshot, TMethods, TContext>
): StoreDispatch<TSnapshot, TMethods>;

/**
 * Creates a dispatch function for a store — controlled by structured options.
 *
 * The `options` object controls which action categories are dispatchable:
 *
 * - `builtin` — built-in keys (`set`, `update`, `getByPath`, `setByPath`, `batch`, `reset`).
 *   Array of keys or `true` for all. Defaults to **none** when omitted.
 * - `domain` — methods from the store's `methods` builder.
 *   Array of keys or `true` for all. Defaults to **all** when omitted.
 *
 * Dispatching any key outside the resolved set throws at runtime and is a
 * type error at compile time.
 *
 * @example
 * const dispatch = createStoreDispatch(patientStore, { domain: ['load', 'reset'] });
 *
 * dispatch('load', patientId); // ✅
 * dispatch('reset');           // ✅
 * dispatch('set', next);       // ❌ type error + runtime throw
 */
export function createStoreDispatch<
  TSnapshot,
  TMethods extends object,
  TContext,
  const TBuiltin extends readonly (keyof BuiltinDispatchable<TSnapshot>)[] | true = readonly [],
  const TDomain extends readonly Extract<keyof TMethods, string>[] | true = true,
>(
  store: Store<TSnapshot, TMethods, TContext>,
  options: DispatchOptions<TSnapshot, TMethods, TBuiltin, TDomain>
): StoreDispatch<
  TSnapshot,
  TMethods,
  Extract<
    ResolveBuiltin<TSnapshot, TBuiltin> | ResolveDomain<TMethods, TDomain>,
    keyof DispatchableActions<TSnapshot, TMethods>
  >
>;

export function createStoreDispatch<TSnapshot, TMethods extends object, TContext = never>(
  store: Store<TSnapshot, TMethods, TContext>,
  options?: {
    readonly builtin?: readonly string[] | true | undefined;
    readonly domain?: readonly string[] | true | undefined;
  }
): StoreDispatch<TSnapshot, TMethods> {
  let allowed: Set<string> | null = null;

  if (options !== undefined) {
    allowed = new Set<string>();
    const { builtin, domain } = options;

    // Resolve builtins
    if (builtin === true) {
      for (const k of BUILTIN_KEYS) {
        allowed.add(k);
      }
    } else if (builtin !== undefined) {
      for (const k of builtin) {
        allowed.add(k);
      }
    }

    // Resolve domain — default to all when omitted
    if (domain === undefined || domain === true) {
      for (const k of Object.keys(store)) {
        if (!NON_DOMAIN_KEYS.has(k)) {
          allowed.add(k);
        }
      }
    } else {
      for (const k of domain) {
        allowed.add(k);
      }
    }
  }

  return function dispatch(action: string, ...args: unknown[]): unknown {
    if (allowed !== null && !allowed.has(action)) {
      throw new Error(`dispatch: action "${action}" is not in the allowed set`);
    }
    const method = (store as Record<string, unknown>)[action];
    if (typeof method !== 'function') {
      throw new Error(`dispatch: unknown action "${action}"`);
    }
    return (method as (...a: unknown[]) => unknown)(...args);
  } as StoreDispatch<TSnapshot, TMethods>;
}
