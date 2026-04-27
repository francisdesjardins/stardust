import type { StoreApi } from './create-store';
import type { PathsOf, ValueAtPath } from './path-utils';
import { copyOnWritePath, parsePath } from './path-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Typed accessor for an array field inside a `createStore` snapshot.
 *
 * Returned by {@link createArrayMethods} and intended to be spread into
 * (or nested inside) the store's domain methods.
 *
 * Two setter patterns — pick whichever reads better at the call site:
 * - `set(i, partial)`               — merge several fields at once
 * - `setByPath(i, 'nested.key', v)` — surgical typed-path update
 *
 * All operations use **structural sharing** internally — only the array
 * and the targeted item are shallow-copied; the rest of the snapshot
 * keeps identity with the previous version.
 *
 * @example
 * const store = createStore(INITIAL, (api) => ({
 *   phones: createArrayMethods(api, 'phones', { number: '', label: 'mobile' }),
 * }));
 *
 * store.phones.add();
 * store.phones.set(0, { number: '5141234567' });
 * store.phones.setByPath(0, 'label', 'work');
 * store.phones.remove(1);
 * store.phones.move(0, 2);
 */
export type ArrayMethods<TItem extends object> = {
  /** Append an item. Defaults are deep-cloned; `overrides` shallow-merges on top. */
  readonly add: (overrides?: Partial<TItem>) => void;
  /** Remove the item at `index`. Out-of-bounds is a safe no-op. */
  readonly remove: (index: number) => void;
  /** Patch one or more properties on the item at `index`. Out-of-bounds is a safe no-op. */
  readonly set: (index: number, partial: Partial<TItem>) => void;
  /** Set a single deeply-nested property via a typed path. Out-of-bounds is a safe no-op. */
  readonly setByPath: <P extends PathsOf<TItem>>(
    index: number,
    path: P,
    value: ValueAtPath<TItem, P>
  ) => void;
  /** Move an item from one index to another. Out-of-bounds is a safe no-op. */
  readonly move: (from: number, to: number) => void;
};

/**
 * Read/write primitives passed to the optional `methods` builder of
 * {@link createArrayMethods}. Use these to implement domain-specific
 * lookups or mutations without accessing the outer store API directly.
 */
export type ArrayMethodsApi<TItem extends object> = {
  /** Read current array items. */
  readonly getArray: () => TItem[];
  /** Write a new array, using structural sharing on the parent snapshot. */
  readonly setArray: (next: TItem[]) => void;
};

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a typed set of methods for an array field inside a store.
 *
 * Call this inside the `methods` builder of {@link createStore} where
 * `StoreApi` is available, then expose the result as a namespaced
 * property on the store.
 *
 * Unlike `update()`, array methods use **structural sharing**
 * via `setByPath` — the full snapshot is never `structuredClone`d. Only
 * the path to the array and the array itself are shallow-copied.
 *
 * The `defaults` value is `structuredClone`d on every `add()` call so
 * items never share references with each other or with the template.
 *
 * @param api       - The `StoreApi` received by the store's methods builder.
 * @param arrayPath - A typed path string pointing to the array field in the
 *                    snapshot (e.g. `'phones'`, `'user.addresses'`).
 * @param defaults  - Template item cloned for each `add()`. Must be a POJO
 *                    (same constraint as store snapshots).
 * @param methods   - Optional builder for domain-specific methods. Receives
 *                    `{ getArray, setArray }` and the base `ArrayMethods`. Return
 *                    value is merged onto the returned methods object.
 *
 * @example
 * const store = createStore({ items: [] as Todo[] }, (api) => ({
 *   items: createArrayMethods(api, 'items', { text: '', done: false }),
 * }));
 *
 * store.items.add({ text: 'Buy milk' });
 * store.items.set(0, { done: true });
 * store.items.setByPath(0, 'text', 'Buy oat milk');
 * store.items.remove(0);
 *
 * @example — with custom methods
 * const store = createStore({ services: [] as Service[] }, (api) => ({
 *   services: createArrayMethods(api, 'services', DEFAULT_SERVICE, ({ getArray, setArray }) => ({
 *     findById(id: string) { return getArray().find(s => s.id === id); },
 *     advanceById(id: string) {
 *       const index = getArray().findIndex(s => s.id === id);
 *       if (index !== -1) { setArray(getArray().map((s, i) => i === index ? { ...s, done: true } : s)); }
 *     },
 *   })),
 * }));
 */
export function createArrayMethods<
  TSnapshot,
  TItem extends object,
  TContext = never,
  TMethods extends Record<string, unknown> = Record<never, never>,
>(
  api: StoreApi<TSnapshot, TContext>,
  arrayPath: PathsOf<TSnapshot>,
  defaults: TItem,
  methods?: (arrayApi: ArrayMethodsApi<TItem>) => TMethods
): ArrayMethods<TItem> & TMethods {
  // Pre-parse once, reuse the cached segments
  const arraySegments = parsePath(arrayPath);

  /** Read the current array value from the snapshot. */
  function getArray(): TItem[] {
    return api.getByPath(arrayPath) as TItem[];
  }

  /** Write a new array value back using structural sharing. */
  function setArray(next: TItem[]): void {
    api.set(copyOnWritePath(api.get(), arraySegments, next));
  }

  const field: ArrayMethods<TItem> = {
    add(overrides?: Partial<TItem>): void {
      const item = structuredClone(defaults);
      if (overrides) {
        Object.assign(item as object, overrides);
      }
      setArray([...getArray(), item]);
    },

    remove(index: number): void {
      const arr = getArray();
      if (index >= 0 && index < arr.length) {
        setArray(arr.toSpliced(index, 1));
      }
    },

    set(index: number, partial: Partial<TItem>): void {
      const arr = getArray();
      const item = arr[index];
      if (item) {
        setArray(arr.with(index, { ...item, ...partial }));
      }
    },

    setByPath(index, path, value) {
      const arr = getArray();
      const item = arr[index];
      if (item) {
        const segments = parsePath(path);
        const updatedItem = copyOnWritePath(item, segments, value);
        setArray(arr.with(index, updatedItem));
      }
    },

    move(from: number, to: number): void {
      if (from === to) {
        return;
      }
      const arr = getArray();
      if (from >= 0 && from < arr.length && to >= 0 && to < arr.length) {
        const item = arr[from];
        if (item) {
          // Single mutable copy + two in-place splices — one fewer intermediate
          // array than arr.toSpliced(from, 1).toSpliced(to, 0, item).
          const next = [...arr];
          next.splice(from, 1);
          next.splice(to, 0, item);
          setArray(next);
        }
      }
    },
  };

  const arrayApi: ArrayMethodsApi<TItem> = { getArray, setArray };
  const domainMethods = methods !== undefined ? methods(arrayApi) : ({} as TMethods);
  return { ...field, ...domainMethods };
}
