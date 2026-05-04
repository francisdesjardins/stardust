import { normalizeError } from './utils/normalize-error';

/**
 * Standard cached state shape for store snapshots.
 *
 * A discriminated union on `status` — use the `status` field to narrow:
 * - `'idle'` — no data has been loaded yet.
 * - `'pending'` — a fetch is in flight; `data` carries the previous value if
 *   `keepPreviousData` was set, or `undefined` when showing a fresh load.
 * - `'fresh'` — data was loaded successfully; `expiresAt` carries the
 *   absolute timestamp (ms) after which the data is considered stale, or
 *   `undefined` if no TTL was configured.
 * - `'expired'` — the TTL has elapsed; `data` still carries the last good
 *   value. Compose with `createDerivedStore` or `watch` to react to expiry.
 * - `'rejected'` — the last fetch failed; `error` is the normalized `Error`
 *   and `data` carries the last good value, if any.
 *
 * @example
 * type UserState = { user: CachedState<User> };
 * const store = createStore({ user: cachedIdle } satisfies UserState, (api) => ({
 *   userCache: createCachedSlice(api, 'user'),
 * }));
 *
 * // React to expiry via a derived store:
 * const isExpired = createDerivedStore([store], ([s]) => s.user.status === 'expired');
 */
export type CachedIdle = { readonly status: 'idle' };
export type CachedPending<T> = { readonly status: 'pending'; readonly data: T | undefined };
export type CachedFresh<T> = {
  readonly status: 'fresh';
  readonly data: T;
  readonly expiresAt: number | undefined;
};
export type CachedExpired<T> = {
  readonly status: 'expired';
  readonly data: T;
  readonly expiresAt: number;
};
export type CachedRejected<T> = {
  readonly status: 'rejected';
  readonly error: Error;
  readonly data: T | undefined;
};

export type CachedState<T> =
  | CachedIdle
  | CachedPending<T>
  | CachedFresh<T>
  | CachedExpired<T>
  | CachedRejected<T>;

/** Shared singleton — referentially stable across all stores. */
export const cachedIdle: CachedIdle = { status: 'idle' };

/**
 * Constructs a pending cached state, preserving previous data when provided.
 * Returns the specific `CachedPending<T>` type for discriminated-union narrowing.
 */
export function cachedPending<T>(data?: T): CachedPending<T> {
  return { status: 'pending', data };
}

/**
 * Constructs a fresh cached state for use as the initial value of a
 * `CachedState<T>` store field. Returning `CachedState<T>` (not the narrower
 * `CachedFresh<T>`) lets TypeScript infer the correct snapshot type when the
 * value is passed to `createStore` or used as a field initializer.
 *
 * @example
 * const store = createStore(cachedFresh(initialData), (api) => ({
 *   cache: createCachedSlice(api),
 * }));
 * store.cache.set(newData, Date.now() + 60_000); // fresh for 60 s
 */
export function cachedFresh<T>(data: T, expiresAt?: number): CachedState<T> {
  return { status: 'fresh', data, expiresAt };
}

/** Constructs an expired cached state — data is preserved for display while re-fetching. */
export function cachedExpired<T>(data: T, expiresAt: number): CachedExpired<T> {
  return { status: 'expired', data, expiresAt };
}

/**
 * Wraps any thrown value via `normalizeError` — consistent with `safeAwait`.
 * Accepts `unknown` so callers never need to cast in `catch` blocks.
 */
export function cachedRejected<T>(error: unknown, data?: T): CachedRejected<T> {
  return { status: 'rejected', error: normalizeError(error), data };
}

/** Extracts the `data` field from any `CachedState`. Returns `undefined` for `CachedIdle`. */
export function getCachedData<T>(state: CachedState<T>): T | undefined {
  return state.status === 'idle' ? undefined : state.data;
}
