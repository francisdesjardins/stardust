/**
 * createStore — get() and set() operations.
 *
 * Fastest store operations — bypass structuredClone entirely.
 * get() is zero-copy; set() replaces state directly; reset() deep-clones
 * the stored baseline. Compare with "createStore — update" for the
 * structuredClone path.
 */

import { createStore } from '@stardust/core';
import { bench, group } from '../mitata.ts';

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

group('createStore — get / set', () => {
  bench('get() flat', function* () {
    const store = createStore({ ...FLAT_INITIAL }, () => ({ actions: {} }));
    yield () => store.getSnapshot();
  });

  bench('set() object replacement', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ set }) => ({
      actions: {
        replace() {
          set({ count: 1, label: 'x', active: false });
        },
      },
    }));
    yield () => store.actions.replace();
  });

  bench('set() updater fn', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ set }) => ({
      actions: {
        increment() {
          set((prev) => ({ ...prev, count: prev.count + 1 }));
        },
      },
    }));
    yield () => store.actions.increment();
  });

  bench('set() nested replacement', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL), ({ set }) => ({
      actions: {
        replace() {
          set({
            user: { name: 'Bob', address: { city: 'Toronto', zip: 'M5V' } },
            scores: [1, 2, 3],
          });
        },
      },
    }));
    yield () => store.actions.replace();
  });

  bench('reset()', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({ actions: {} }));
    yield () => store.reset();
  });

  bench('reset(newSnapshot)', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({ actions: {} }));
    const next = structuredClone(NESTED_INITIAL);
    yield () => store.reset(next);
  });

  bench('reset(updater fn)', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({ actions: {} }));
    yield () => store.reset((initial) => ({ ...initial, user: { ...initial.user, name: 'Bob' } }));
  });
});
