/**
 * produce — Immer-style immutable updates via structuredClone + mutation.
 *
 * produce(state, recipe) deep-clones the entire state with structuredClone,
 * passes the clone to the recipe for in-place mutation, then returns the
 * mutated clone as the new immutable snapshot.
 *
 * This is the simplest immutable-update API but carries the full cost of
 * structuredClone on every call. Compare with:
 * - "structuredClone baseline" to see the raw clone cost (produce's floor)
 * - "copyOnWritePath" for structural sharing that avoids full clones
 * - "createStore — update" which uses produce internally
 *
 * Scaling tests: flat → nested → arrays → wide objects (20 keys, 50 items)
 * show how clone cost grows with state size.
 *
 * N = 100,000 for small states, N_SMALL = 10,000 for large arrays.
 */

import { produce } from '@stardust/core';
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
const N_SMALL = 10_000;

export function register(bench: Bench): void {
  {
    const state = { ...FLAT_INITIAL };
    bench('produce', 'produce flat single-field', N, () => {
      sink(
        produce(state, (d) => {
          d.count = 1;
        })
      );
    });
  }

  {
    const state = { ...FLAT_INITIAL };
    bench('produce', 'produce flat all-fields', N, () => {
      sink(
        produce(state, (d) => {
          d.count = 1;
          d.label = 'changed';
          d.active = false;
        })
      );
    });
  }

  {
    const state = structuredClone(NESTED_INITIAL);
    bench('produce', 'produce nested', N, () => {
      sink(
        produce(state, (d) => {
          d.user.address.city = 'Vancouver';
        })
      );
    });
  }

  {
    const state = { items: [1, 2, 3, 4, 5] };
    bench('produce', 'produce array push + pop', N, () => {
      sink(
        produce(state, (d) => {
          d.items.push(99);
          d.items.pop();
        })
      );
    });
  }

  {
    const state: Record<string, number> = {};
    for (let i = 0; i < 20; i++) {
      state[`key${String(i)}`] = i;
    }
    bench('produce', 'produce 20-key flat', N, () => {
      sink(
        produce(state, (d) => {
          d['key0'] = 999;
        })
      );
    });
  }

  {
    const state = {
      items: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `v${String(i)}` })),
    };
    bench('produce', 'produce 50-item array', N_SMALL, () => {
      sink(
        produce(state, (d) => {
          const item = d.items[0];
          if (item) {
            item.value = 'changed';
          }
        })
      );
    });
  }
}
