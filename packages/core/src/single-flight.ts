/**
 * Single-flight deduplication — collapses N concurrent callers into one execution.
 *
 * While a task is in-flight every subsequent call receives the same promise.
 * Once the task settles the gate clears; the next call starts a fresh execution.
 *
 * Only the thunk form `() => Promise<T>` is accepted — an eager `Promise<T>`
 * has already started executing before the deduplicator can see it, so it
 * cannot be deduplicated.
 *
 * Compare with {@link createMutex}: the mutex *serializes* (N calls run N times,
 * one at a time); single-flight *deduplicates* (N concurrent calls share one
 * execution — one network request, one store update).
 *
 * @example
 * // singleton — deduplicate a one-off module-scope operation
 * await safeSingleFlight(() => fetchConfig())
 *
 * // scoped — one gate per store method
 * const loadFlight = createSingleFlight()
 * const configStore = createStore({ config: null }, ({ update, getContext }) => ({
 *   load(): Promise<void> {
 *     return loadFlight(async () => {
 *       const [err, config] = await safeAwait(getContext().fetchConfig())
 *       if (err !== null) { logger.warn(err.message); return }
 *       update(d => { d.config = config })
 *     })
 *   },
 * }))
 */

export type SingleFlight = <T>(task: () => Promise<T>) => Promise<T>;

export const createSingleFlight = (): SingleFlight => {
  let inflight: Promise<unknown> | null = null;

  return <T>(task: () => Promise<T>): Promise<T> => {
    if (inflight === null) {
      inflight = task().finally(() => {
        inflight = null;
      });
    }

    // Safe: a SingleFlight instance is bound to one operation at a given call
    // site. The Promise<unknown> slot holds exactly one in-flight Promise<T>
    // at a time — the cast recovers that T. Storing as unknown avoids requiring
    // a type param at createSingleFlight() call sites (matching createMutex ergonomics).
    return inflight as Promise<T>;
  };
};

/** Singleton single-flight — convenient for one-off module-scope deduplication. */
export const safeSingleFlight: SingleFlight = createSingleFlight();
