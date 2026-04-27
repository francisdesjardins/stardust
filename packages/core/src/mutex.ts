/**
 * Async mutex — serializes concurrent calls through a single promise gate.
 *
 * Two forms:
 *   - thunk  `() => T | Promise<T>` — deferred; starts only when gate opens
 *   - eager  `T | Promise<T>`        — already running; mutex serializes resolution
 *
 * The gate never stalls: errors in one task do not block subsequent tasks.
 *
 * Compare with {@link createSingleFlight}: single-flight *deduplicates* (N concurrent
 * calls share one execution); the mutex *serializes* (N calls run N times, one at a time).
 *
 * @example
 * // singleton (module-level shared gate)
 * await safeMutex(() => dispatch('asyncLoadDefaults'))
 *
 * // scoped mutex per resource (independent gate from the singleton)
 * const userMutex = createMutex()
 * await userMutex(() => saveUser(payload))
 *
 * // inline async thunk
 * await userMutex(async () => {
 *   await asyncThing()
 * })
 */

type Task<T> = (() => T | Promise<T>) | Promise<T> | T;

export type Mutex = <T>(task: Task<T>) => Promise<T>;

export const createMutex = (): Mutex => {
  let gate: Promise<void> = Promise.resolve();

  return <T>(task: Task<T>): Promise<T> => {
    const acquired = gate;

    const execution: Promise<T> = acquired.then(() =>
      // thunk: deferred execution (starts only when the gate opens)
      // value/promise: eager — execution already started, we just serialize the await
      typeof task === 'function' ? (task as () => T | Promise<T>)() : task
    );

    // advance gate regardless of success/failure — queue must never stall
    gate = execution.then(
      () => {},
      () => {}
    );

    return execution;
  };
};

/** Singleton mutex — convenient for one-off serialization at module scope. */
export const safeMutex: Mutex = createMutex();
