import type { Store } from './create-store';
import type { DispatchOptions, LeafPaths } from './create-store-dispatch';

// ── Type-level filtering ──────────────────────────────────────────────────

/** Extracts the head segment before the first dot. */
type HeadOf<T extends string> = T extends `${infer H}.${string}` ? H : never;

/**
 * Recursively picks only the keys reachable via `TPaths` (a union of
 * dot-notation leaf paths) from `TMethods`.
 */
export type PickByLeafPaths<TMethods, TPaths extends string> = {
  [K in keyof TMethods as K extends string
    ? K extends TPaths | HeadOf<TPaths>
      ? K
      : never
    : never]: K extends string
    ? TMethods[K] extends Record<string, unknown>
      ? PickByLeafPaths<TMethods[K], TPaths extends `${K}.${infer Rest}` ? Rest : never>
      : TMethods[K]
    : never;
};

/** Resolves the return type of `createBoundActions` given a domain constraint. */
type BoundActionsReturn<
  TMethods extends object,
  TDomain extends readonly LeafPaths<TMethods>[] | true,
> = TDomain extends true
  ? TMethods
  : TDomain extends readonly (infer P extends string)[]
    ? PickByLeafPaths<TMethods, P>
    : TMethods;

/**
 * Creates an object-shaped dispatch for a Stardust store.
 *
 * Returns an object mirroring the structure of `store.actions`, allowing
 * method calls via property access: `actions.fn1.fn2(value)` instead of
 * string paths. Useful for Redux-like patterns in React contexts.
 *
 * By default all actions are reachable. Use the `domain` option to restrict
 * to specific leaf paths — attempts to call non-whitelisted methods throw
 * at runtime.
 *
 * @example <caption>All-actions access</caption>
 * const actions = createBoundActions(store);
 * actions.increment();
 * actions.todos.add('Buy milk');
 *
 * @example <caption>Restricted access (runtime validation)</caption>
 * const actions = createBoundActions(store, { domain: ['load', 'todos.add'] });
 * actions.load(id);        // ✅
 * actions.todos.add(text); // ✅
 * actions.increment();     // ❌ throws at runtime
 */
export function createBoundActions<TSnapshot, TMethods extends object, TContext = never>(
  store: Store<TSnapshot, TMethods, TContext>
): TMethods;

export function createBoundActions<
  TSnapshot,
  TMethods extends object,
  TContext,
  const TDomain extends readonly LeafPaths<TMethods>[] | true = true,
>(
  store: Store<TSnapshot, TMethods, TContext>,
  options: DispatchOptions<TMethods, TDomain>
): BoundActionsReturn<TMethods, TDomain>;

export function createBoundActions<TSnapshot, TMethods extends object, TContext = never>(
  store: Store<TSnapshot, TMethods, TContext>,
  options?: {
    readonly domain?: readonly string[] | true | undefined;
  }
): TMethods {
  // Build the set of allowed leaf paths
  const allowed = buildAllowedSet(store.actions as Record<string, unknown>, options?.domain);

  // No domain restriction: return actions directly
  if (allowed === null) {
    return store.actions;
  }

  // With domain restriction: wrap with proxy to guard access
  return createGuardedProxy(store.actions as Record<string, unknown>, '', allowed) as TMethods;
}

function buildAllowedSet(
  obj: Record<string, unknown>,
  domain: readonly string[] | true | undefined
): Set<string> | null {
  if (domain === undefined) {
    return null;
  }

  if (domain === true) {
    const leaves = new Set<string>();
    flattenLeaves(obj, '', leaves);
    return leaves;
  }

  return new Set(domain);
}

function flattenLeaves(obj: Record<string, unknown>, prefix: string, out: Set<string>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'function') {
      out.add(path);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenLeaves(value as Record<string, unknown>, path, out);
    }
  }
}

function createGuardedProxy(
  obj: Record<string, unknown>,
  prefix: string,
  allowed: Set<string>
): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target: Record<string, unknown>, prop: string | symbol): unknown {
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop);
      }

      const value = target[prop];
      const path = prefix ? `${prefix}.${prop}` : prop;

      // Recursively wrap nested objects
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return createGuardedProxy(value as Record<string, unknown>, path, allowed);
      }

      // Wrap functions to check domain restrictions
      if (typeof value === 'function') {
        if (!allowed.has(path)) {
          return () => {
            throw new Error(`boundActions: action "${path}" is not in the allowed set`);
          };
        }
      }

      return value;
    },
  };

  return new Proxy(obj, handler);
}
