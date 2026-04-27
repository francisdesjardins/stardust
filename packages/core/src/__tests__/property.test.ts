/**
 * Property-based and fuzz tests for the Stardust.
 *
 * ## Why property-based testing?
 *
 * Handwritten unit tests verify specific, manually chosen inputs: "given
 * this exact object shape, `copyOnWritePath` produces this exact result."
 * They are fast to write and easy to read, but they only cover the shapes
 * the author thought of. An immutability bug that only surfaces on objects
 * with three sibling keys, or on arrays at a specific index, can slip
 * through every handwritten case while the property is being violated the
 * entire time.
 *
 * Property-based testing inverts this. Instead of providing inputs, you
 * describe an **invariant that must hold for ALL inputs**, and the library
 * (fast-check here) generates hundreds of random inputs to try to falsify
 * it. When a violation is found, fast-check automatically shrinks the
 * failing input to the smallest possible counterexample — the minimal
 * object shape, the shortest sequence — making the root cause immediately
 * obvious.
 *
 * Sequence length for fuzz tests: an immutability violation surfaces on
 * the very next mutation after a snapshot is captured, so a sequence of
 * length 1 is theoretically sufficient to find any real bug. Longer
 * sequences (5–20 ops) give fast-check more combinations of operation
 * types to exercise, and also give the shrinker more room to find a clean
 * minimal example.
 *
 * ## What is tested
 *
 * **`copyOnWritePath` structural sharing (9 properties, 200–300 runs each)**
 *
 * `copyOnWritePath` is the core of every `setByPath` and `createArrayMethods`
 * write. Its contract has two halves:
 *
 *   - Unchanged branches MUST keep the exact same object reference. This is
 *     what makes `Object.is`-based selector equality fast — if the reference
 *     is unchanged, no re-render.
 *   - The original root MUST NOT be mutated. All immutability guarantees in
 *     the store depend on this.
 *
 * The properties cover flat objects (2-key and 4-key), nested objects
 * (2-level), array roots, and chains of sequential writes where each
 * intermediate result must hold the value written to it.
 *
 * **Store immutability fuzz sequences (3 properties, 50–100 runs each)**
 *
 * A higher-level smoke test: do all three mutation paths in the store
 * (`set`, `setByPath` via structural sharing, and `update` via
 * `structuredClone`) compose correctly under arbitrary operation sequences?
 * Each run:
 *   1. Captures the current snapshot reference before every operation.
 *   2. Runs the operation.
 *   3. After all operations, verifies every previously captured snapshot
 *      still holds exactly the values it had when it was captured.
 *
 * A single `find` + `expect(violated).toBeUndefined()` is used instead of
 * a per-entry assertion loop — this keeps the Playwright test-explorer step
 * count at 1 per run regardless of sequence length.
 */

import { expect, test } from '@playwright/test';
import * as fc from 'fast-check';
import { createStore, shallowEqual } from '..';
import { copyOnWritePath, getAtPath } from '../path-utils';

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** A plain primitive value (safe as a path leaf). */
const primitiveArb = fc.oneof(fc.integer(), fc.string(), fc.boolean());

/** A plain object with two top-level keys whose reference identity we can check. */
const flatTwoKeyArb = fc.record({
  target: primitiveArb,
  sibling: fc.record({ x: fc.integer(), y: fc.string() }),
});

/** A flat object with four top-level keys — we write to one, check the other three. */
const flatFourKeyArb = fc.record({
  a: primitiveArb,
  b: fc.record({ v: fc.integer() }),
  c: fc.record({ v: fc.string() }),
  d: fc.array(fc.integer(), { maxLength: 5 }),
});

/** A two-level nested object. */
const nestedArb = fc.record({
  user: fc.record({ name: fc.string(), age: fc.integer() }),
  meta: fc.record({ id: fc.string() }),
});

/** A one-level array-of-objects. */
const arrayRootArb = fc
  .array(fc.record({ id: fc.string(), value: fc.integer() }), {
    minLength: 2,
    maxLength: 8,
  })
  .filter((arr) => arr.length >= 2);

// ── copyOnWritePath — structural sharing invariants ──────────────────────────

test.describe('copyOnWritePath — structural sharing (property)', () => {
  test('flat object: unchanged sibling always keeps reference identity', () => {
    fc.assert(
      fc.property(flatTwoKeyArb, primitiveArb, (original, newVal) => {
        const siblingRef = original.sibling;
        const result = copyOnWritePath(original, ['target'], newVal);
        // Written field has new value
        expect(result.target).toBe(newVal);
        // Unwritten sibling keeps the exact same object reference
        expect(result.sibling).toBe(siblingRef);
      }),
      { numRuns: 300 }
    );
  });

  test('flat object: three untouched branches all keep reference identity', () => {
    fc.assert(
      fc.property(flatFourKeyArb, primitiveArb, (original, newVal) => {
        const bRef = original.b;
        const cRef = original.c;
        const dRef = original.d;
        const result = copyOnWritePath(original, ['a'], newVal);
        expect(result.b).toBe(bRef);
        expect(result.c).toBe(cRef);
        expect(result.d).toBe(dRef);
      }),
      { numRuns: 300 }
    );
  });

  test('flat object: original root is never mutated', () => {
    fc.assert(
      fc.property(flatTwoKeyArb, primitiveArb, (original, newVal) => {
        const before = original.target;
        copyOnWritePath(original, ['target'], newVal);
        // Original target must be exactly what it was before the call
        expect(original.target).toBe(before);
      }),
      { numRuns: 300 }
    );
  });

  test('flat object: result is always a new root reference', () => {
    fc.assert(
      fc.property(flatTwoKeyArb, primitiveArb, (original, newVal) => {
        const result = copyOnWritePath(original, ['target'], newVal);
        expect(result).not.toBe(original);
      }),
      { numRuns: 300 }
    );
  });

  test('nested object: sibling branch at root level keeps reference identity', () => {
    fc.assert(
      fc.property(nestedArb, fc.string(), (original, newName) => {
        const metaRef = original.meta;
        const result = copyOnWritePath(original, ['user', 'name'], newName);
        // meta is untouched — must be the same reference
        expect(result.meta).toBe(metaRef);
      }),
      { numRuns: 300 }
    );
  });

  test('nested object: original values are never mutated', () => {
    fc.assert(
      fc.property(nestedArb, fc.string(), (original, newName) => {
        const nameBefore = original.user.name;
        copyOnWritePath(original, ['user', 'name'], newName);
        expect(original.user.name).toBe(nameBefore);
      }),
      { numRuns: 300 }
    );
  });

  test('nested object: written value is correctly set in result', () => {
    fc.assert(
      fc.property(nestedArb, fc.string(), (original, newName) => {
        const result = copyOnWritePath(original, ['user', 'name'], newName);
        expect(result.user.name).toBe(newName);
      }),
      { numRuns: 300 }
    );
  });

  test('array root: unmodified element keeps reference identity', () => {
    fc.assert(
      fc.property(arrayRootArb, fc.integer(), (original, newVal) => {
        // Write to index 0's value; index 1+ should keep reference
        const otherRef = original[1];
        const result = copyOnWritePath(original, [0, 'value'], newVal);
        expect(result[1]).toBe(otherRef);
      }),
      { numRuns: 200 }
    );
  });

  test('array root: original array element is never mutated', () => {
    fc.assert(
      fc.property(arrayRootArb, fc.integer(), (original, newVal) => {
        const valueBefore = original[0]?.value;
        copyOnWritePath(original, [0, 'value'], newVal);
        expect(original[0]?.value).toBe(valueBefore);
      }),
      { numRuns: 200 }
    );
  });

  test('multiple sequential writes: each prior result is never retroactively mutated', () => {
    fc.assert(
      fc.property(
        nestedArb,
        fc.array(fc.string(), { minLength: 3, maxLength: 10 }),
        (original, names) => {
          const results: Array<typeof original> = [];
          let current = original;
          for (const name of names) {
            const next = copyOnWritePath(current, ['user', 'name'], name);
            results.push(next);
            current = next;
          }
          // Each result's name must equal the name that was written to it — no retroactive mutation
          for (let i = 0; i < results.length; i++) {
            expect(results[i]?.user.name).toBe(names[i]);
          }
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ── Store immutability — fuzz sequences ──────────────────────────────────────

type FuzzSnapshot = { count: number; label: string; items: string[] };

/**
 * Creates a store for fuzz testing. The store's methods cover the three
 * mutation paths: `setByPath` (structural sharing), `update` (full clone),
 * and `set` (whole-state swap).
 */
function makeFuzzStore() {
  return createStore(
    { count: 0, label: '', items: [] as string[] } satisfies FuzzSnapshot,
    ({ set, update, setByPath }) => ({
      increment: () => {
        update((d) => {
          d.count += 1;
        });
      },
      setLabel: (v: string) => {
        setByPath('label', v);
      },
      addItem: (v: string) => {
        update((d) => {
          d.items.push(v);
        });
      },
      setCount: (n: number) => {
        setByPath('count', n);
      },
      reset: () => {
        set({ count: 0, label: '', items: [] });
      },
    })
  );
}

/** Operation discriminant for fuzz sequences. */
type Op =
  | { type: 'increment' }
  | { type: 'setLabel'; value: string }
  | { type: 'addItem'; value: string }
  | { type: 'setCount'; value: number }
  | { type: 'reset' }
  | { type: 'batch'; ops: Array<{ type: 'increment' } | { type: 'setCount'; value: number }> };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.constant({ type: 'increment' } as const),
  fc.string().map((v) => ({ type: 'setLabel', value: v }) as const),
  fc.string().map((v) => ({ type: 'addItem', value: v }) as const),
  fc.integer({ min: -1000, max: 1000 }).map((v) => ({ type: 'setCount', value: v }) as const),
  fc.constant({ type: 'reset' } as const),
  fc
    .array(
      fc.oneof(
        fc.constant({ type: 'increment' } as const),
        fc.integer({ min: 0, max: 100 }).map((v) => ({ type: 'setCount', value: v }) as const)
      ),
      { minLength: 1, maxLength: 5 }
    )
    .map((ops) => ({ type: 'batch', ops }) as const)
);

test.describe('store — immutability fuzz sequences', () => {
  test('no prior snapshot is ever mutated in-place across a sequence of operations', () => {
    fc.assert(
      fc.property(fc.array(opArb, { minLength: 5, maxLength: 20 }), (ops) => {
        const store = makeFuzzStore();
        type Entry = { snap: FuzzSnapshot; count: number; label: string; itemsLength: number };
        const history: Entry[] = [];

        for (const op of ops) {
          const snap = store.getSnapshot();
          history.push({
            snap,
            count: snap.count,
            label: snap.label,
            itemsLength: snap.items.length,
          });

          switch (op.type) {
            case 'increment':
              store.increment();
              break;
            case 'setLabel':
              store.setLabel(op.value);
              break;
            case 'addItem':
              store.addItem(op.value);
              break;
            case 'setCount':
              store.setCount(op.value);
              break;
            case 'reset':
              store.reset();
              break;
            case 'batch':
              store.batch(() => {
                for (const bop of op.ops) {
                  if (bop.type === 'increment') {
                    store.increment();
                  } else {
                    store.setCount(bop.value);
                  }
                }
              });
              break;
          }
        }

        // One assertion: any retroactive mutation surfaces as a non-undefined violation
        const violated = history.find(
          ({ snap, count, label, itemsLength }) =>
            snap.count !== count || snap.label !== label || snap.items.length !== itemsLength
        );
        expect(violated).toBeUndefined();
      }),
      { numRuns: 50 }
    );
  });

  test('setByPath never mutates prior snapshots (structural sharing preserves past state)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.integer({ min: 0, max: 999 }).map((v) => ({ field: 'count' as const, value: v })),
            fc.string({ maxLength: 10 }).map((v) => ({ field: 'label' as const, value: v }))
          ),
          { minLength: 5, maxLength: 15 }
        ),
        (writes) => {
          const store = makeFuzzStore();
          const history: Array<{ snap: FuzzSnapshot; count: number; label: string }> = [];

          for (const w of writes) {
            const snap = store.getSnapshot();
            history.push({ snap, count: snap.count, label: snap.label });
            if (w.field === 'count') {
              store.setCount(w.value);
            } else {
              store.setLabel(w.value);
            }
          }

          const violated = history.find(
            ({ snap, count, label }) => snap.count !== count || snap.label !== label
          );
          expect(violated).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('update() never mutates prior snapshot arrays in-place', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 8 }), { minLength: 3, maxLength: 10 }),
        (itemsToAdd) => {
          const store = makeFuzzStore();
          const history: Array<{ arr: string[]; length: number }> = [];

          for (const item of itemsToAdd) {
            const snap = store.getSnapshot();
            history.push({ arr: snap.items, length: snap.items.length });
            store.addItem(item);
          }

          // Each captured array reference must not have grown (was not mutated in-place)
          const violated = history.find(({ arr, length }) => arr.length !== length);
          expect(violated).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── copyOnWritePath — round-trip correctness ─────────────────────────────────

/**
 * Round-trip property: after writing a value at a path, reading back via
 * `getAtPath` must return exactly that value. This verifies the
 * write–read contract holds for any combination of object shape, path
 * depth, and leaf value — not just the manually chosen cases in the unit
 * tests.
 *
 * Separate properties cover flat (1-segment) and nested (2-segment) paths
 * so the generator produces valid intermediate nodes in both cases.
 */
test.describe('copyOnWritePath — round-trip correctness (property)', () => {
  test('flat path: getAtPath(result, seg) === written value', () => {
    fc.assert(
      fc.property(flatTwoKeyArb, primitiveArb, (original, newVal) => {
        const segments = ['target'] as const;
        const result = copyOnWritePath(original, segments, newVal);
        expect(getAtPath(result, segments)).toBe(newVal);
      }),
      { numRuns: 300 }
    );
  });

  test('nested path: getAtPath(result, segments) === written value', () => {
    fc.assert(
      fc.property(nestedArb, fc.string(), (original, newName) => {
        const segments = ['user', 'name'] as const;
        const result = copyOnWritePath(original, segments, newName);
        expect(getAtPath(result, segments)).toBe(newName);
      }),
      { numRuns: 300 }
    );
  });

  test('array element path: getAtPath(result, segments) === written value', () => {
    fc.assert(
      fc.property(arrayRootArb, fc.integer(), (original, newVal) => {
        const segments = [0, 'value'] as const;
        const result = copyOnWritePath(original, segments, newVal);
        expect(getAtPath(result, segments)).toBe(newVal);
      }),
      { numRuns: 200 }
    );
  });
});

// ── shallowEqual — algebraic properties ──────────────────────────────────────

/**
 * `shallowEqual` must satisfy two algebraic laws that any reasonable
 * equality function should obey:
 *
 *   - **Reflexivity**: `shallowEqual(a, a)` is always `true`. An object is
 *     always shallow-equal to itself. If this fails, a derived store using
 *     `shallowEqual` would fire listeners when the source did not change.
 *
 *   - **Symmetry**: `shallowEqual(a, b) === shallowEqual(b, a)`. Violations
 *     here are subtle: a derived store's equality check could behave
 *     differently depending on which argument is "current" and which is
 *     "next", producing spurious re-renders in one direction only.
 *
 * Both properties are checked over primitives, flat objects, and arrays so
 * every branch of the implementation is exercised.
 */

/** Arbitrary that generates primitives, flat objects, or arrays. */
const shallowValueArb = fc.oneof(
  primitiveArb,
  fc.record({ a: fc.integer(), b: fc.string() }),
  fc.array(fc.integer(), { maxLength: 6 })
);

test.describe('shallowEqual — algebraic properties (property)', () => {
  test('reflexivity: shallowEqual(x, x) is always true', () => {
    fc.assert(
      fc.property(shallowValueArb, (x) => {
        expect(shallowEqual(x, x)).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  test('symmetry: shallowEqual(a, b) === shallowEqual(b, a)', () => {
    fc.assert(
      fc.property(shallowValueArb, shallowValueArb, (a, b) => {
        expect(shallowEqual(a, b)).toBe(shallowEqual(b, a));
      }),
      { numRuns: 500 }
    );
  });

  test('mutation detection: modifying a value makes shallowEqual return false', () => {
    fc.assert(
      fc.property(
        fc.record({ a: fc.integer(), b: fc.integer({ min: 1 }) }),
        fc.integer(),
        (original, differentVal) => {
          // Ensure the replacement is genuinely different from original.a
          fc.pre(differentVal !== original.a);
          const mutated = { ...original, a: differentVal };
          expect(shallowEqual(original, mutated)).toBe(false);
        }
      ),
      { numRuns: 300 }
    );
  });
});
