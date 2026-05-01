import type { StoreApi } from './create-store';
import type { PathsOf, ValueAtPath } from './path-utils';
import { copyOnWritePath, parsePath } from './path-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Standard set of mutation helpers for an array field in a Stardust store.
 *
 * Returned by {@link ArrayMethodsFactory.mount} and intended to be spread into your store's domain methods.
 *
 * - All operations use structural sharing: only the array and the changed item are shallow-copied; all other branches retain reference identity.
 * - Out-of-bounds indices are safe no-ops.
 * - Use `set` for partial updates, or `setByPath` for deep/surgical changes.
 *
 * @template TItem - The array item type (must be a POJO).
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
   * Update the first item matching the predicate. Does nothing if no match is found.
   * @param predicate - Function to find the item to update.
   * @param partial - Partial fields to merge into the item.
   * @param updater - Lazy updater callback that returns partial fields to merge.
   */
  readonly update: (
    predicate: (value: TItem, index: number, arr: TItem[]) => boolean,
    partialOrUpdater: Partial<TItem> | ((item: TItem) => Partial<TItem>)
  ) => void;
  /**
   * Move an item from one index to another. Does nothing if out of bounds or if `from === to`.
   * @param from - Source index.
   * @param to - Destination index.
   */
  readonly move: (from: number, to: number) => void;
  /**
   * Replace an existing item if the predicate matches, or append it if no match is found.
   * When `needle` is an array, each item is upserted in order in a single store write.
   *
   * @param needle - Item or array of items to upsert.
   * @param predicate - Matching function. Inside the callback, `this` is the needle being tested.
   *   **Must be a `function` expression — not an arrow function.** Arrow functions capture `this`
   *   lexically and will not receive the needle as `this`.
   *
   * @example
   * store.items.upsert(serverItem, function (item) {
   *   return this.id === item.id;
   * });
   */
  readonly upsert: (
    needle: TItem | TItem[],
    predicate: (this: TItem, value: TItem, index: number, arr: TItem[]) => boolean
  ) => void;
};

/**
 * Returned by {@link createArrayMethods}. Call `.mount(api, path)` inside your domain builder to bind
 * the helpers to a specific store and array path.
 *
 * @template TItem - The array item type.
 */
/** Filters `PathsOf<TSnapshot>` to only paths whose value extends `TItem[]`. */
type ArrayPathsOf<TSnapshot, TItem extends object> = {
  [P in PathsOf<TSnapshot>]: ValueAtPath<TSnapshot, P> extends TItem[] ? P : never;
}[PathsOf<TSnapshot>];

/**
 * Returned by {@link createArrayMethods}. Call `.mount(api, path)` inside your domain builder to bind
 * the helpers to a specific store and array path.
 *
 * @template TItem - The array item type.
 */
export type ArrayMethodsFactory<TItem extends object> = {
  /**
   * Bind the array helpers to a specific store and array path.
   *
   * Writes use structural sharing (`setSnapshot` + `copyOnWritePath`) — no `structuredClone` on the full snapshot.
   *
   * @param api - The StoreApi received by your store's domain builder.
   * @param path - Path to an array field of `TItem[]` within the snapshot (non-array paths are excluded).
   */
  mount<TSnapshot, TContext = never>(
    api: StoreApi<TSnapshot, TContext>,
    path: ArrayPathsOf<TSnapshot, TItem>
  ): ArrayMethods<TItem>;
};

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a reusable factory for typed array mutation helpers.
 *
 * **Two-stage usage:**
 * 1. Call `createArrayMethods<TItem>(defaults)` once — outside the store builder — to define the item shape and defaults.
 * 2. Call `.mount(api, path)` inside your domain builder to bind the helpers to a store + path.
 *
 * Provide `TItem` explicitly to prevent TypeScript from narrowing literal types (e.g. `asyncIdle` → `AsyncIdle`), avoiding the need for `as` casts.
 *
 * - All mutations use structural sharing: only the array and changed item are shallow-copied.
 * - The `defaults` template is deep-cloned for each new item, so no references are shared between items.
 * - The same factory can be mounted in multiple stores or at different paths.
 *
 * @template TItem - The array item type (must be a POJO).
 *
 * @param defaults - Template item to clone for each new entry.
 * @returns A factory with a `.mount(api, path)` method.
 *
 * @example <caption>Basic usage</caption>
 * type Phone = { number: string; label: string };
 * const phoneOps = createArrayMethods<Phone>({ number: '', label: 'mobile' });
 *
 * const store = createStore({ phones: [] as Phone[] }, (api) => ({
 *   phones: phoneOps.mount(api, 'phones'),
 * }));
 *
 * store.phones.add({ number: '5141234567' });
 * store.phones.set(0, { label: 'work' });
 * store.phones.setByPath(0, 'number', '5149876543');
 * store.phones.update((phone) => phone.number === '5141234567', { label: 'mobile' });
 * store.phones.remove(1);
 * store.phones.move(0, 2);
 *
 * @example <caption>Reuse across stores</caption>
 * const phoneOps = createArrayMethods<Phone>({ number: '', label: 'mobile' });
 *
 * const contactStore = createStore({ phones: [] as Phone[] }, (api) => ({
 *   phones: phoneOps.mount(api, 'phones'),
 * }));
 *
 * const emergencyStore = createStore({ contacts: [] as Phone[] }, (api) => ({
 *   contacts: phoneOps.mount(api, 'contacts'),
 * }));
 *
 * @example <caption>With asyncIdle — no `as` cast needed</caption>
 * type Task = { title: string; status: AsyncState<Result> };
 * const taskOps = createArrayMethods<Task>({ title: '', status: asyncIdle });
 */
export function createArrayMethods<TItem extends object>(
  defaults: TItem
): ArrayMethodsFactory<TItem> {
  return {
    mount<TSnapshot, TContext = never>(
      api: StoreApi<TSnapshot, TContext>,
      arrayPath: ArrayPathsOf<TSnapshot, TItem>
    ): ArrayMethods<TItem> {
      const arraySegments = parsePath(arrayPath);

      function getArray(): TItem[] {
        return api.getByPath(arrayPath) as TItem[];
      }

      function setArray(next: TItem[]): void {
        api.set(copyOnWritePath(api.get(), arraySegments, next));
      }

      return {
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

        update(
          predicate: (value: TItem, index: number, arr: TItem[]) => boolean,
          partialOrUpdater: Partial<TItem> | ((item: TItem) => Partial<TItem>)
        ): void {
          const arr = getArray();
          const index = arr.findIndex(predicate);
          if (index === -1) {
            return;
          }
          const item = arr[index];
          if (item === undefined) {
            return;
          }

          const partial =
            typeof partialOrUpdater === 'function' ? partialOrUpdater(item) : partialOrUpdater;

          const updatedItem = { ...item, ...partial };
          setArray(arr.with(index, updatedItem));
        },

        move(from: number, to: number): void {
          if (from === to) {
            return;
          }
          const arr = getArray();
          if (from >= 0 && from < arr.length && to >= 0 && to < arr.length) {
            const item = arr[from];
            if (item) {
              const next = [...arr];
              next.splice(from, 1);
              next.splice(to, 0, item);
              setArray(next);
            }
          }
        },

        upsert(needle, predicate) {
          const needles = Array.isArray(needle) ? needle : [needle];
          let arr = getArray();
          for (const n of needles) {
            const index = arr.findIndex(predicate, n);
            arr = index > -1 ? arr.with(index, n) : [...arr, n];
          }
          setArray(arr);
        },
      };
    },
  };
}
