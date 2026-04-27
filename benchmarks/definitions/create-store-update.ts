/**
 * createStore — update() uses structuredClone + mutate internally.
 *
 * update() clones the entire state, lets you mutate the clone, then
 * replaces the store snapshot. This is the ergonomic but slower path —
 * compare with "structuredClone baseline" to see the clone overhead,
 * and "createStore — get / set" for the zero-clone alternative.
 *
 * N = 100,000 iterations for fast ops, N_SMALL = 10,000 for array
 * operations that modify state each iteration.
 */

import { createStore } from '@stardust/core';
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
const N_SMALL = 10_000;

export function register(bench: Bench): void {
  {
    const store = createStore({ ...FLAT_INITIAL }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    bench('createStore — update', 'update() single field flat', N, () => {
      store.increment();
    });
  }

  {
    const store = createStore({ ...FLAT_INITIAL }, ({ update }) => ({
      mutateAll() {
        update((d) => {
          d.count += 1;
          d.label = 'changed';
          d.active = !d.active;
        });
      },
    }));
    bench('createStore — update', 'update() multi-field flat', N, () => {
      store.mutateAll();
    });
  }

  {
    const store = createStore(structuredClone(NESTED_INITIAL), ({ update }) => ({
      changeCity() {
        update((d) => {
          d.user.address.city = 'Vancouver';
        });
      },
    }));
    bench('createStore — update', 'update() deeply nested', N, () => {
      store.changeCity();
    });
  }

  {
    const store = createStore({ items: [1, 2, 3] }, ({ update }) => ({
      push() {
        update((d) => {
          d.items.push(99);
        });
      },
      reset() {
        update((d) => {
          d.items.length = 3;
        });
      },
    }));
    bench('createStore — update', 'update() array push (reset each)', N_SMALL, () => {
      store.push();
      store.reset();
    });
  }
}
