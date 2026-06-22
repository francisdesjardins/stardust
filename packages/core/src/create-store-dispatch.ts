import type { DomainStore } from './create-store';
import { DOMAIN_METHODS } from './create-store';

// ── Type-level leaf-path extraction ──────────────────────────────────────────

// Depth counter for LeafPaths — prevents infinite recursion on deeply nested types.
type Depth = [never, 0, 1, 2, 3];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

/** Resolves the leaf function type at a dot-notation path within an object. */
export type LeafAt<T, Path extends string> = Path extends `${infer Head}.${infer Tail}`
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
 * domain method on the store, forwarding arguments and return values.
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

/**
 * Walks `obj` and records the segments of each leaf-function path.
 * Stored paths (not function references) are resolved against the store's
 * domain methods at dispatch time so that wrappers installed after
 * construction — e.g. `connectDebugLog` — are always invoked.
 */
function flattenLeafPaths(
  obj: Record<string, unknown>,
  prefix: readonly string[],
  out: Map<string, readonly string[]>
): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const segments = [...prefix, key];
    if (typeof value === 'function') {
      out.set(segments.join('.'), segments);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenLeafPaths(value as Record<string, unknown>, segments, out);
    }
  }
}

function resolveLeaf(
  methods: Record<string, unknown>,
  segments: readonly string[]
): (...args: unknown[]) => unknown {
  let current: unknown = methods;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') {
      throw new Error(
        `dispatch: path "${segments.join('.')}" no longer resolves on the store's domain methods`
      );
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (typeof current !== 'function') {
    throw new Error(
      `dispatch: path "${segments.join('.')}" is not a function on the store's domain methods`
    );
  }
  return current as (...args: unknown[]) => unknown;
}

function readDomainMethods(store: object): Record<string, unknown> {
  const domain = (store as Record<symbol, unknown>)[DOMAIN_METHODS];
  if (domain === undefined) {
    throw new Error(
      'createStoreDispatch: store has no domain methods. Pass a store created with createStore(initial, builder).'
    );
  }
  return domain as Record<string, unknown>;
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a dispatch function for a Stardust domain store.
 *
 * Domain methods are addressed by dot-notation leaf path. Nested method
 * objects are flattened at construction time — dispatch is O(1). By default
 * all leaf actions are reachable. Use the `domain` option to restrict.
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
  store: DomainStore<TSnapshot, TMethods, TContext>
): StoreDispatch<TMethods>;

export function createStoreDispatch<
  TSnapshot,
  TMethods extends object,
  TContext,
  const TDomain extends readonly LeafPaths<TMethods>[] | true = true,
>(
  store: DomainStore<TSnapshot, TMethods, TContext>,
  options: DispatchOptions<TMethods, TDomain>
): StoreDispatch<TMethods, Extract<ResolveDomain<TMethods, TDomain>, LeafPaths<TMethods>>>;

export function createStoreDispatch<TSnapshot, TMethods extends object, TContext = never>(
  store: DomainStore<TSnapshot, TMethods, TContext>,
  options?: {
    readonly domain?: readonly string[] | true | undefined;
  }
): StoreDispatch<TMethods> {
  const domainMethods = readDomainMethods(store);

  const leafPaths = new Map<string, readonly string[]>();
  flattenLeafPaths(domainMethods, [], leafPaths);

  const allowed: Set<string> | null =
    options === undefined
      ? null
      : options.domain === undefined || options.domain === true
        ? new Set(leafPaths.keys())
        : new Set(options.domain);

  return function dispatch(action: string, ...args: unknown[]): unknown {
    if (allowed !== null && !allowed.has(action)) {
      throw new Error(`dispatch: action "${action}" is not in the allowed set`);
    }
    const segments = leafPaths.get(action);
    if (segments === undefined) {
      throw new Error(`dispatch: unknown action "${action}"`);
    }
    const fn = resolveLeaf(domainMethods, segments);
    return fn(...args);
  } as StoreDispatch<TMethods>;
}
