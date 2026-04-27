// ── watch ────────────────────────────────────────────────────────────────────
//
// Non-React equivalent of `useStore` with a selector.
// Fires `callback(newValue, oldValue)` only when the selected slice changes.
// Zero React imports — safe for Node, Vue, plain JS, and the store standalone build.

/** @internal */
type Subscribable<TSnapshot> = {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TSnapshot;
};

/**
 * Options for {@link watch}.
 */
export type WatchOptions<T> = {
  /**
   * Custom equality function. Defaults to `Object.is`.
   *
   * Pass `shallowEqual` when your selector returns a new object/array literal
   * on every call (same shape, different reference) to avoid spurious callbacks.
   */
  readonly equals?: ((a: T, b: T) => boolean) | undefined;
};

/**
 * Observes a store outside React. Returns an unsubscribe function.
 *
 * Two overloads:
 * - Bare callback — watches the entire snapshot: `watch(store, cb)`
 * - Selector + callback — watches a derived slice: `watch(store, sel, cb, opts?)`
 *
 * The callback fires with `(newValue, oldValue)` only when the observed value
 * changes (by `Object.is` or a custom `equals`). It does **not** fire
 * immediately on subscription — only on the first mutation that produces a
 * changed value.
 *
 * @example
 * // Watch full snapshot
 * const unsub = watch(store, (next, prev) => console.log(next, prev));
 *
 * // Watch a slice
 * const unsub = watch(store, (s) => s.count, (next, prev) => {
 *   console.log('count changed', prev, '→', next);
 * });
 *
 * // Watch a derived object with shallowEqual
 * const unsub = watch(store, (s) => ({ a: s.a, b: s.b }), onChange, { equals: shallowEqual });
 *
 * unsub(); // stop watching
 */
export function watch<TSnapshot>(
  store: Subscribable<TSnapshot>,
  callback: (next: TSnapshot, prev: TSnapshot) => void
): () => void;
export function watch<TSnapshot, T>(
  store: Subscribable<TSnapshot>,
  selector: (snap: TSnapshot) => T,
  callback: (next: T, prev: T) => void,
  options?: WatchOptions<T>
): () => void;
export function watch<TSnapshot, T = TSnapshot>(
  store: Subscribable<TSnapshot>,
  selectorOrCallback: ((snap: TSnapshot) => T) | ((next: TSnapshot, prev: TSnapshot) => void),
  callback?: (next: T, prev: T) => void,
  options?: WatchOptions<T>
): () => void {
  // ── Resolve overload ─────────────────────────────────────────────────────
  let selector: (snap: TSnapshot) => T;
  let cb: (next: T, prev: T) => void;

  if (callback === undefined) {
    // Bare-callback overload: selectorOrCallback IS the callback
    selector = (snap) => snap as unknown as T;
    // Safe: when callback is undefined, selectorOrCallback is the bare callback
    // with signature (next: TSnapshot, prev: TSnapshot) => void, and T = TSnapshot.
    cb = selectorOrCallback as unknown as (next: T, prev: T) => void;
  } else {
    selector = selectorOrCallback as (snap: TSnapshot) => T;
    cb = callback;
  }

  const equals = options?.equals ?? Object.is;
  let prev = selector(store.getSnapshot());

  return store.subscribe(() => {
    const next = selector(store.getSnapshot());
    if (!equals(prev, next)) {
      const old = prev;
      prev = next;
      cb(next, old);
    }
  });
}
