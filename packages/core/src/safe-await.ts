import { normalizeError } from './utils/normalize-error';

/**
 * Go-style `[error, result]` safe-await tuple.
 *
 * - `[null, result]`  — resolved
 * - `[Error, null]`   — rejected (any thrown value normalized to `Error`)
 *
 * @example
 * const [err, user] = await safeAwait(api.fetchUser(id));
 * if (err !== null) { logger.warn('fetch failed', { err: err.message }); return; }
 * console.log(user.name);
 */
export type SafeAwaitResult<T> =
  | readonly [error: null, result: T]
  | readonly [error: Error, result: null];

export async function safeAwait<T>(promise: Promise<T>): Promise<SafeAwaitResult<T>> {
  try {
    return [null, await promise];
  } catch (err: unknown) {
    return [normalizeError(err), null];
  }
}
