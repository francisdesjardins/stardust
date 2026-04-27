/**
 * End-to-end: store update + listener notification.
 *
 * Measures the full cost of a state change as a React component would
 * experience it: mutation → clone → snapshot replacement → subscriber
 * callbacks. This is the "real-world" path — every other benchmark
 * isolates a single layer.
 *
 * Scaling axis: number of listeners (1 → 10) and write method
 * (update() vs setByPath). setByPath + listeners combines structural
 * sharing, path parsing, and fan-out in a single call.
 *
 * N = 100,000 for simple update + few listeners,
 * N_SMALL = 10,000 for setByPath + 10 listeners (clone + path + fan-out).
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
    store.subscribe(() => {});
    bench('End-to-end: store + listeners', 'update() + 1 listener', N, () => {
      store.increment();
    });
  }

  {
    const store = createStore({ ...FLAT_INITIAL }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    for (let i = 0; i < 10; i++) {
      store.subscribe(() => {});
    }
    bench('End-to-end: store + listeners', 'update() + 10 listeners', N, () => {
      store.increment();
    });
  }

  {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({}));
    for (let i = 0; i < 10; i++) {
      store.subscribe(() => {});
    }
    bench('End-to-end: store + listeners', 'setByPath + 10 listeners nested', N_SMALL, () => {
      store.setByPath('user.address.city', 'Vancouver');
    });
  }
}
