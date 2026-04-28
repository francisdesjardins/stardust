import type { StoreApi } from './create-store';
import type { PathsOf, ValueAtPath } from './path-utils';
import { copyOnWritePath, parsePath } from './path-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Standard set of mutation helpers for an array field in a Stardust store.
 *
 * Returned by {@link createArrayMethods} and intended to be spread into your store's domain methods.
 *
 * - All operations use structural sharing: only the array and the changed item are shallow-copied; all other branches retain reference identity.
 * - Out-of-bounds indices are safe no-ops.
 * - Use `set` for partial updates, or `setByPath` for deep/surgical changes.
 *
 * @template TItem - The array item type (must be a POJO).
 *
 * @example <caption>Basic usage</caption>
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
  /**
   * Add a new item to the end of the array. The `defaults` template is deep-cloned for each new item; `overrides` are shallow-merged on top.
   * @param overrides - Optional partial fields to override the defaults.
   */
  readonly add: (overrides?: Partial<TItem>) => void;
  /**
   * Remove the item at the given index. Does nothing if out of bounds.
   * @param index - The array index to remove.
   */
  readonly remove: (index: number) => void;
  /**
   * Patch one or more properties on the item at the given index. Does nothing if out of bounds.
   * @param index - The array index to update.
   * @param partial - Partial object to merge into the item.
   */
  readonly set: (index: number, partial: Partial<TItem>) => void;
  /**
   * Set a single deeply-nested property on the item at the given index, using a typed path string. Does nothing if out of bounds.
   * @param index - The array index to update.
   * @param path - Dot/bracket path string (e.g. 'address.city').
   * @param value - The value to set at the path.
   */
  readonly setByPath: <P extends PathsOf<TItem>>(
    index: number,
    path: P,
    value: ValueAtPath<TItem, P>
  ) => void;
  /**
   * Move an item from one index to another. Does nothing if out of bounds or if `from === to`.
   * @param from - Source index.
   * @param to - Destination index.
   */
  readonly move: (from: number, to: number) => void;
};

/**
 * Minimal array access API for custom methods in {@link createArrayMethods}.
 *
 * Use these helpers to implement domain-specific lookups or mutations without accessing the outer store API directly.
 *
 * @template TItem - The array item type.
 */
export type ArrayMethodsApi<TItem extends object> = {
  /**
   * Get the current array value from the store snapshot.
   * @returns The array of items.
   */
  readonly getArray: () => TItem[];
  /**
   * Replace the array value in the store snapshot, using structural sharing.
   * @param next - The new array value.
   */
  readonly setArray: (next: TItem[]) => void;
};

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a namespaced set of mutation helpers for an array field in a Stardust store.
 *
 * Use this inside your store's domain methods builder to add ergonomic, type-safe array operations.
 *
 * - All mutations use structural sharing: only the array and changed item are shallow-copied.
 * - The `defaults` template is deep-cloned for each new item, so no references are shared.
 * - You can extend the returned object with custom methods (e.g. finders, batch updaters) by passing a builder function.
 *
 * @template TSnapshot - The store snapshot type.
 * @template TItem - The array item type (must be a POJO).
 * @template TContext - Optional context type for the store.
 * @template TMethods - Additional custom methods to merge in.
 *
 * @param api - The StoreApi received by your store's methods builder.
 * @param arrayPath - Typed path string to the array field (e.g. 'phones', 'user.addresses').
 * @param defaults - Template item to clone for each new entry (must be POJO).
 * @param methods - Optional builder for custom methods. Receives { getArray, setArray } and the base ArrayMethods.
 * @returns An object with standard array mutation helpers, plus any custom methods.
 *
 * @example <caption>Basic usage</caption>
 * const store = createStore({ items: [] as Todo[] }, (api) => ({
 *   items: createArrayMethods(api, 'items', { text: '', done: false }),
 * }));
 * store.items.add({ text: 'Buy milk' });
 * store.items.set(0, { done: true });
 * store.items.setByPath(0, 'text', 'Buy oat milk');
 * store.items.remove(0);
 *
 * @example <caption>With custom methods</caption>
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
