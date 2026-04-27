// ── Shallow equality ──────────────────────────────────────────────────────────

type AnyObj = Record<string, unknown>;

/**
 * Shallow comparison of two values.
 *
 * - Primitives: `===` identity check
 * - Objects/arrays: compares own enumerable keys — same count, same keys,
 *   and `Object.is` per value
 * - Returns `true` when values are considered equal (no re-render needed)
 *
 * Intended as the default equality function for `createDerivedStore`, where
 * derive functions typically return new object literals on every call.
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);

  if (keysA.length !== Object.keys(b).length) {
    return false;
  }

  for (const key of keysA) {
    if (!Object.hasOwn(b, key) || !Object.is((a as AnyObj)[key], (b as AnyObj)[key])) {
      return false;
    }
  }

  return true;
}
