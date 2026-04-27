/**
 * createStore — get() and set() operations.
 *
 * These are the fastest store operations because they bypass
 * structuredClone entirely:
 * - get() returns the current snapshot reference (zero-copy)
 * - set() replaces the entire state or uses an updater function
 * - reset() restores the initial snapshot via structuredClone(resetSnapshot)
 *   (deep-clones the stored baseline on every reset call)
 *
 * Compare with "createStore — update" which uses structuredClone on every call.
 *
 * N = 100,000 iterations per benchmark.
 *
 * Stability notes (observed CV from latest stable run):
 * - get() flat, set() object/updater/nested: CV ~19–23% — bimodal JIT. These
 *   trivial operations run at 60–250M ops/s, a range where V8 aggressively
 *   tier-compiles and may deoptimise between rounds. Min is roughly half of
 *   max across runs. The median is reliable; ignore the raw stddev here.
 * - reset(): CV ~16% — structuredClone allocation triggers minor GC pauses;
 *   moderate variance is expected but median tracks real cost well.
 * - reset(newSnapshot): CV similar to reset() — one clone to store the new
 *   baseline, then commit original directly. Same clone budget as bare reset().
 * - reset(updater fn): ~2× cost of bare reset() — two structuredClone calls
 *   (one for the updater input, one for the resulting baseline).
 */

import { createStore } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

// ── Initial values ──────────────────────────────────────────────────────────

type Flat = { count: number; label: string; active: boolean };
type Nested = {
  user: { name: string; address: { city: string; zip: string } };
  scores: number[];
};

const FLAT_INITIAL: Flat = { count: 0, label: 'bench', active: true };
const NESTED_INITIAL: Nested = {
  user: { name: 'Alice', address: { city: 'Montreal', zip: 'H2X' } },
  scores: [10, 20, 30, 40, 50],
};

const N = 100_000;

export function register(bench: Bench): void {
  {
    const store = createStore({ ...FLAT_INITIAL }, () => ({}));
    bench('createStore — get / set', 'get() flat', N, () => {
      sink(store.getSnapshot());
    });
  }

  {
    const store = createStore({ ...FLAT_INITIAL }, ({ set }) => ({
      replace() {
        set({ count: 1, label: 'x', active: false });
      },
    }));
    bench('createStore — get / set', 'set() object replacement', N, () => {
      store.replace();
    });
  }

  {
    const store = createStore({ ...FLAT_INITIAL }, ({ set }) => ({
      increment() {
        set((prev) => ({ ...prev, count: prev.count + 1 }));
      },
    }));
    bench('createStore — get / set', 'set() updater fn', N, () => {
      store.increment();
    });
  }

  {
    const store = createStore(structuredClone(NESTED_INITIAL), ({ set }) => ({
      replace() {
        set({
          user: { name: 'Bob', address: { city: 'Toronto', zip: 'M5V' } },
          scores: [1, 2, 3],
        });
      },
    }));
    bench('createStore — get / set', 'set() nested replacement', N, () => {
      store.replace();
    });
  }

  {
    // reset() restores the deep-cloned initial snapshot captured at createStore() time.
    // Cost = structuredClone(resetSnapshot) per call — same as cloning the initial state.
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({}));
    bench('createStore — get / set', 'reset()', N, () => {
      store.reset();
    });
  }

  {
    // reset(newSnapshot) commits the new snapshot AND updates the stored baseline.
    // Cost = structuredClone(newSnapshot) for the new baseline + commit. Two clone
    // calls (new baseline + the implicit clone on the next bare reset()) make this
    // slightly heavier than bare reset() but still structuredClone-bound.
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({}));
    const next = structuredClone(NESTED_INITIAL);
    bench('createStore — get / set', 'reset(newSnapshot)', N, () => {
      store.reset(next);
    });
  }

  {
    // reset(updater fn) receives a clone of the current baseline, passes it to the
    // updater, then clones the result as the new baseline before committing.
    // Cost = structuredClone(resetSnapshot) + structuredClone(resolved) per call.
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({}));
    bench('createStore — get / set', 'reset(updater fn)', N, () => {
      store.reset((initial) => ({ ...initial, user: { ...initial.user, name: 'Bob' } }));
    });
  }
}
