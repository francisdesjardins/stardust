/**
 * Lightweight draft-based state updater for POJO snapshots.
 *
 * Creates a deep clone of `state` via `structuredClone`, passes the
 * mutable draft to `recipe`, and returns the result. The original
 * state is never mutated.
 *
 * **POJO contract**: `state` must be `structuredClone`-compatible —
 * plain objects, arrays, primitives, `Date`, `Map`, `Set`, `ArrayBuffer`,
 * etc. Functions, DOM nodes, and symbols will throw at runtime.
 *
 * @example
 * const next = produce(state, (draft) => {
 *   draft.name = 'Alice';
 *   delete draft.errors.name;
 * });
 */
export function produce<T>(state: T, recipe: (draft: T) => void): T {
  const draft = structuredClone(state);
  recipe(draft);
  return draft;
}
