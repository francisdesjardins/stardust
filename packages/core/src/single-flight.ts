/**
 * Single-flight deduplication — collapses N concurrent callers into one execution.
 *
 * Two modes are available via {@link SingleFlightOptions}:
 *
 * **`'first'` (default)** — the first in-flight execution wins. Every subsequent
 * concurrent call receives the same promise. Once the task settles the gate clears;
 * the next call starts a fresh execution. Signal passed to the task never aborts.
 *
 * **`'last'`** — each new call supersedes the previous one. The previous task's
 * {@link AbortSignal} is aborted immediately so the caller can cancel any underlying
 * request (e.g. `fetch(url, { signal })`). All concurrent waiters share a single
 * deferred promise that resolves/rejects with the **last** task's outcome.
 *
 * Only the thunk form `(signal: AbortSignal) => Promise<T>` is accepted — an eager
 * `Promise<T>` has already started executing before the deduplicator can see it.
 * Callers that do not need the signal can simply ignore the parameter.
 *
 * Compare with {@link createMutex}: the mutex *serializes* (N calls run N times,
 * one at a time); single-flight *deduplicates* (N concurrent calls share one
 * execution).
 *
 * @example
 * // 'first' mode (default) — singleton convenience
 * await safeSingleFlight(() => fetchConfig())
 *
 * // 'first' mode — scoped gate
 * const loadFlight = createFirstFlight()
 * store.actions.load = () => loadFlight(() => fetch('/api/config').then(r => r.json()))
 *
 * // 'last' mode — last caller wins, previous fetch is cancelled
 * const searchFlight = createLastFlight()
 * store.actions.search = (query: string) =>
 *   searchFlight((signal) => fetch(`/api/search?q=${query}`, { signal }).then(r => r.json()))
 */

export type SingleFlightTask<T> = (signal: AbortSignal) => Promise<T>;
export type SingleFlightMode = 'first' | 'last';
export type SingleFlightOptions = { mode?: SingleFlightMode };
export type SingleFlight = <T>(task: SingleFlightTask<T>) => Promise<T>;

export const createSingleFlight = (options?: SingleFlightOptions): SingleFlight => {
  const mode = options?.mode ?? 'first';

  if (mode === 'first') {
    let inflight: Promise<unknown> | null = null;

    return <T>(task: SingleFlightTask<T>): Promise<T> => {
      if (inflight === null) {
        const controller = new AbortController();
        inflight = task(controller.signal).finally(() => {
          inflight = null;
        });
      }

      // Safe: a SingleFlight instance is bound to one operation at a given call
      // site. The Promise<unknown> slot holds exactly one in-flight Promise<T>
      // at a time — the cast recovers that T. Storing as unknown avoids requiring
      // a type param at createSingleFlight() call sites (matching createMutex ergonomics).
      return inflight as Promise<T>;
    };
  }

  // 'last' mode — generation counter ensures only the most-recent task settles
  // the shared deferred. The superseded task's controller is aborted immediately.
  let controller: AbortController | null = null;
  let resolve: ((v: unknown) => void) | null = null;
  let reject: ((e: unknown) => void) | null = null;
  let deferred: Promise<unknown> | null = null;
  let generation = 0;

  return <T>(task: SingleFlightTask<T>): Promise<T> => {
    controller?.abort();
    controller = new AbortController();

    if (deferred === null) {
      deferred = new Promise<unknown>((res, rej) => {
        resolve = res;
        reject = rej;
      });
    }

    const myGen = ++generation;
    task(controller.signal).then(
      (v) => {
        if (myGen !== generation) return;
        deferred = null;
        controller = null;
        resolve?.(v);
        resolve = null;
        reject = null;
      },
      (e) => {
        if (myGen !== generation) return;
        deferred = null;
        controller = null;
        reject?.(e);
        resolve = null;
        reject = null;
      }
    );

    return deferred as Promise<T>;
  };
};

/** First-wins gate — explicit alias for `createSingleFlight({ mode: 'first' })`. */
export const createFirstFlight = (): SingleFlight => createSingleFlight({ mode: 'first' });

/** Last-wins gate — explicit alias for `createSingleFlight({ mode: 'last' })`. */
export const createLastFlight = (): SingleFlight => createSingleFlight({ mode: 'last' });

/** Singleton first-wins gate — convenient for one-off module-scope deduplication. */
export const safeSingleFlight: SingleFlight = createSingleFlight();
