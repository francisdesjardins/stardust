import type { Store } from './create-store';

// ── Type-level leaf-path extraction ──────────────────────────────────────────

// Depth counter for LeafPaths — prevents infinite recursion on deeply nested types.
type Depth = [never, 0, 1, 2, 3];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

/** Resolves the leaf function type at a dot-notation path within an object. */
type LeafAt<T, Path extends string> = Path extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? LeafAt<T[Head], Tail>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;

// ── Helpers ──────────────────────────────────────────────────────────────────

type SafeParams<T> = T extends (...args: infer A) => unknown
  ? unknown[] extends A
    ? A
    : [A] extends [never]
      ? unknown[]
      : A
  : never;

type SafeReturn<T> = T extends (...args: never[]) => infer R
  ? [R] extends [never]
    ? unknown
    : R
  : never;

// ── Dispatch options ─────────────────────────────────────────────────────────

/**
 * Extracts dot-notation paths to all leaf functions in a methods object.
 * Used for type-safe domain restrictions in dispatch functions.
 *
 * @example
 * type Paths = LeafPaths<{ increment(): void; todos: { add(t: string): void } }>
 * // 'increment' | 'todos.add'
 */
export type LeafPaths<T, Prefix extends string = '', D extends 0 | 1 | 2 | 3 = 3> = [D] extends [0]
  ? never
  : {
      [K in Extract<keyof T, string>]: T[K] extends AnyFn
        ? Prefix extends ''
          ? K
          : `${Prefix}.${K}`
        : T[K] extends Record<string, unknown>
          ? LeafPaths<T[K], Prefix extends '' ? K : `${Prefix}.${K}`, Depth[D]>
          : never;
    }[Extract<keyof T, string>];

/**
 * Options for `createStoreDispatch` controlling which actions are dispatchable.
 *
 * - `domain` — leaf action paths (dot-notation) to allow. Pass an array of
 *   paths to restrict, or `true` to allow all. Defaults to **all** when omitted.
 *
 * @example
 * createStoreDispatch(store, { domain: ['load', 'todos.add'] });
 */
export type DispatchOptions<
  TMethods extends object,
  TDomain extends readonly LeafPaths<TMethods>[] | true = true,
> = {
  readonly domain?: TDomain | undefined;
};

type ResolveDomain<TMethods extends object, TDomain> = TDomain extends true
  ? LeafPaths<TMethods>
  : TDomain extends readonly LeafPaths<TMethods>[]
    ? TDomain[number]
    : never;

/**
 * A dispatch function that routes a dot-notation leaf path to the corresponding
 * action in `store.actions`, forwarding arguments and return values.
 *
 * Nested actions are addressed with dot-notation: `'todos.add'`.
 * Only leaf functions are dispatchable — intermediate objects are not.
 *
 * Return values pass through — async actions work with `await dispatch(...)`.
 *
 * @example
 * const dispatch = createStoreDispatch(store);
 * dispatch('increment');         // ✅ top-level action
 * dispatch('todos.add', text);   // ✅ nested action
 */
export type StoreDispatch<
  TMethods extends object,
  TAllowed extends LeafPaths<TMethods> = LeafPaths<TMethods>,
> = <K extends TAllowed>(
  action: K,
  ...args: SafeParams<LeafAt<TMethods, K & string>>
) => SafeReturn<LeafAt<TMethods, K & string>>;

// ── Runtime leaf flattening ───────────────────────────────────────────────────

function flattenLeaves(
  obj: Record<string, unknown>,
  prefix: string,
  out: Map<string, (...args: unknown[]) => unknown>
): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'function') {
      out.set(path, value as (...args: unknown[]) => unknown);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenLeaves(value as Record<string, unknown>, path, out);
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a dispatch function for a Stardust store.
 *
 * Actions in `store.actions` are addressed by dot-notation leaf path.
 * Nested action objects are flattened at construction time — dispatch is O(1).
 * By default all leaf actions are reachable. Use the `domain` option to restrict.
 *
 * @example <caption>All-actions dispatch</caption>
 * const dispatch = createStoreDispatch(store);
 * dispatch('increment');
 * dispatch('todos.add', 'Buy milk');
 *
 * @example <caption>Restricted dispatch</caption>
 * const dispatch = createStoreDispatch(store, { domain: ['load', 'todos.add'] });
 * dispatch('load', id);
 * dispatch('increment'); // ❌ type error + runtime throw
 */
export function createStoreDispatch<TSnapshot, TMethods extends object, TContext = never>(
  store: Store<TSnapshot, TMethods, TContext>
): StoreDispatch<TMethods>;

export function createStoreDispatch<
  TSnapshot,
  TMethods extends object,
  TContext,
  const TDomain extends readonly LeafPaths<TMethods>[] | true = true,
>(
  store: Store<TSnapshot, TMethods, TContext>,
  options: DispatchOptions<TMethods, TDomain>
): StoreDispatch<TMethods, Extract<ResolveDomain<TMethods, TDomain>, LeafPaths<TMethods>>>;

export function createStoreDispatch<TSnapshot, TMethods extends object, TContext = never>(
  store: Store<TSnapshot, TMethods, TContext>,
  options?: {
    readonly domain?: readonly string[] | true | undefined;
  }
): StoreDispatch<TMethods> {
  const leaves = new Map<string, (...args: unknown[]) => unknown>();
  flattenLeaves(store.actions as unknown as Record<string, unknown>, '', leaves);

  const allowed: Set<string> | null =
    options === undefined
      ? null
      : options.domain === undefined || options.domain === true
        ? new Set(leaves.keys())
        : new Set(options.domain);

  return function dispatch(action: string, ...args: unknown[]): unknown {
    if (allowed !== null && !allowed.has(action)) {
      throw new Error(`dispatch: action "${action}" is not in the allowed set`);
    }
    const fn = leaves.get(action);
    if (fn === undefined) {
      throw new Error(`dispatch: unknown action "${action}"`);
    }
    return fn(...args);
  } as StoreDispatch<TMethods>;
}
