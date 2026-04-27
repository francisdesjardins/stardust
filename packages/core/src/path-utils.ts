import { isNullish } from './utils/is-nullish';

// ── Path types ───────────────────────────────────────────────────────────────

// Depth limiter — prevents infinite recursion on recursive shapes
type Prev = [never, 0, 1, 2, 3, 4, 5];

/**
 * Generates a union of all valid dot/bracket path strings for type `T`, up to
 * 5 levels deep. Used by `setByPath`, `getByPath`, and `createArrayMethods` for
 * type-safe path access.
 *
 * Supports:
 * - Object keys: `'address'`, `'address.city'`
 * - Array indices: `'phones[0]'`, `'phones[0].number'`
 *
 * @example
 * type State = { user: { name: string }; tags: string[] };
 * type P = PathsOf<State>;
 * //   ^? 'user' | 'user.name' | 'tags' | 'tags[number]'
 */
export type PathsOf<T, D extends number = 5> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]:
          | K
          | (NonNullable<T[K]> extends readonly (infer U)[]
              ? `${K}[${number}]` | `${K}[${number}].${PathsOf<NonNullable<U>, Prev[D]>}`
              : NonNullable<T[K]> extends object
                ? `${K}.${PathsOf<NonNullable<T[K]>, Prev[D]>}`
                : never);
      }[keyof T & string]
    : never;

/**
 * Resolves the value type at a given path string `P` within type `T`.
 * Companion to `PathsOf` — used by `setByPath`/`getByPath` to enforce that
 * the written value matches the field type.
 *
 * @example
 * type State = { user: { name: string }; phones: { number: string }[] };
 * type V = ValueAtPath<State, 'user.name'>;  // string
 * type V2 = ValueAtPath<State, 'phones[0]'>; // { number: string }
 */
export type ValueAtPath<T, P extends string> = P extends `${infer K}[${infer _Idx}].${infer Rest}`
  ? K extends keyof T
    ? T[K] extends readonly (infer U)[]
      ? ValueAtPath<NonNullable<U>, Rest>
      : never
    : never
  : P extends `${infer K}[${infer _Idx}]`
    ? K extends keyof T
      ? T[K] extends readonly (infer U)[]
        ? NonNullable<U>
        : never
      : never
    : P extends `${infer K}.${infer Rest}`
      ? K extends keyof T
        ? ValueAtPath<T[K], Rest>
        : never
      : P extends keyof T
        ? T[P]
        : never;

// ── Path runtime helpers ────────────────────────────────────────────────────

type AnyNode = Record<string | number, unknown>;

const pathCache = new Map<string, ReadonlyArray<string | number>>();

/**
 * Parse a dot/bracket path string into an array of segments.
 *
 * Results are memoized — repeated calls with the same path return the
 * same frozen array reference without re-running the regex.
 */
export function parsePath(path: string): ReadonlyArray<string | number> {
  const cached = pathCache.get(path);
  if (cached) {
    return cached;
  }

  const segments: Array<string | number> = [];
  for (const match of path.matchAll(/([^.[]+)|\[(\d+)\]/g)) {
    if (match[1] !== undefined) {
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      segments.push(Number(match[2]));
    }
  }

  const frozen = Object.freeze(segments);
  pathCache.set(path, frozen);
  return frozen;
}

/**
 * Traverse `obj` by following `segments` and return the value at the leaf.
 * Returns `undefined` when any segment resolves to a non-object (safe no-op).
 */
export function getAtPath(obj: unknown, segments: ReadonlyArray<string | number>): unknown {
  let curr = obj;
  for (const seg of segments) {
    if (isNullish(curr) || typeof curr !== 'object') {
      return undefined;
    }
    curr = (curr as AnyNode)[seg];
  }
  return curr;
}

/**
 * Set the value at `segments` inside `obj` by mutating in-place.
 * Safe **only** inside `update()`'s `structuredClone` draft — never call on
 * live snapshot objects.
 */
export function setAtPath(
  obj: unknown,
  segments: ReadonlyArray<string | number>,
  value: unknown
): void {
  let curr = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (isNullish(curr) || typeof curr !== 'object') {
      return;
    }
    const seg = segments[i];
    if (seg === undefined) {
      return;
    }
    curr = (curr as AnyNode)[seg];
  }
  const last = segments[segments.length - 1];
  if (segments.length > 0 && last !== undefined && !isNullish(curr) && typeof curr === 'object') {
    (curr as AnyNode)[last] = value;
  }
}

// ── Structural sharing ──────────────────────────────────────────────────────

/**
 * Immutable set at a path via shallow copies along the mutation path.
 *
 * Only the objects on the direct path from root to the target leaf are
 * shallow-copied; all other branches **share references** with the
 * original tree (structural sharing). This is O(depth) vs O(n) for
 * `structuredClone`.
 *
 * Returns the original `root` unchanged if the path is invalid (a
 * segment resolves to a non-object).
 */
export function copyOnWritePath<T>(
  root: T,
  segments: ReadonlyArray<string | number>,
  value: unknown
): T {
  if (segments.length === 0) {
    return value as T;
  }

  // Shallow-copy root
  const rootCopy = (Array.isArray(root) ? [...root] : { ...(root as object) }) as T;

  let parent: AnyNode = rootCopy as AnyNode;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (seg === undefined) {
      return root;
    }
    const child = parent[seg];
    if (isNullish(child) || typeof child !== 'object') {
      return root; // invalid path — bail, return original unchanged
    }
    const childCopy = Array.isArray(child) ? [...child] : { ...child };
    parent[seg] = childCopy;
    parent = childCopy;
  }

  const lastSeg = segments[segments.length - 1];
  if (lastSeg !== undefined) {
    parent[lastSeg] = value;
  }

  return rootCopy;
}
