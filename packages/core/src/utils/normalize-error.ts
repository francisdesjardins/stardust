/**
 * Coerces an unknown thrown value to an `Error` instance.
 * Pass-through for real `Error` objects; wraps anything else in `new Error(String(err))`.
 */
export function normalizeError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
