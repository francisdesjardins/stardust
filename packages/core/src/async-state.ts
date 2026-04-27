import { normalizeError } from './utils/normalize-error';

/**
 * Standard async state shape for store snapshots.
 *
 * A discriminated union on `status` — narrow with `state.status === 'fulfilled'`
 * to access `data`, or `state.status === 'rejected'` to access `error`.
 *
 * @example
 * type UserState = { user: AsyncState<User> };
 * const store = createStore({ user: asyncIdle } as UserState, ({ update }) => ({
 *   async load(id: string): Promise<void> {
 *     await runAsync(() => api.fetchUser(id), state => update(d => { d.user = state }));
 *   },
 * }));
 */
export type AsyncIdle = { readonly status: 'idle' };
export type AsyncPending = { readonly status: 'pending' };
export type AsyncFulfilled<T> = { readonly status: 'fulfilled'; readonly data: T };
export type AsyncRejected = { readonly status: 'rejected'; readonly error: Error };

export type AsyncState<T> = AsyncIdle | AsyncPending | AsyncFulfilled<T> | AsyncRejected;

/** Shared singleton — referentially stable across all stores. */
export const asyncIdle: AsyncIdle = { status: 'idle' };

/** Shared singleton — referentially stable across all stores. */
export const asyncPending: AsyncPending = { status: 'pending' };

/** Constructs a fulfilled async state carrying `data`. */
export function asyncFulfilled<T>(data: T): AsyncFulfilled<T> {
  return { status: 'fulfilled', data };
}

/**
 * Wraps any thrown value via `normalizeError` — consistent with `safeAwait`.
 * Accepts `unknown` so callers never need to cast in `catch` blocks.
 */
export function asyncRejected(error: unknown): AsyncRejected {
  return { status: 'rejected', error: normalizeError(error) };
}

/**
 * Runs `task()`, calling `onState(asyncPending)` first, then
 * `onState(asyncFulfilled(result))` on success or `onState(asyncRejected(err))`
 * on failure. Returns the final `AsyncFulfilled<T> | AsyncRejected` state so
 * callers can branch on the outcome — e.g. log on rejection or perform
 * additional writes on fulfillment — without resorting to manual transitions.
 *
 * When the task result must be split across multiple store fields, use the
 * constructors directly (`asyncPending` / `asyncFulfilled` / `asyncRejected`).
 *
 * @example
 * async load(id: string): Promise<void> {
 *   const result = await runAsync(
 *     () => api.fetchUser(id),
 *     state => update(d => { d.user = state }),
 *   );
 *   if (result.status === 'rejected') {
 *     logger.warn('load failed', { error: result.error.message });
 *   }
 * }
 */
export async function runAsync<T>(
  task: () => Promise<T>,
  onState: (state: AsyncState<T>) => void
): Promise<AsyncFulfilled<T> | AsyncRejected> {
  onState(asyncPending);
  try {
    const state = asyncFulfilled(await task());
    onState(state);
    return state;
  } catch (err: unknown) {
    const state = asyncRejected(err);
    onState(state);
    return state;
  }
}
