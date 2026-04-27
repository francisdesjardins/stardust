/**
 * structuredClone baseline — reference cost for deep-copy operations.
 *
 * structuredClone is the browser/Node built-in for deep copying plain
 * objects. It's the floor cost for any operation that needs a full
 * independent copy (produce, update). By benchmarking it in isolation
 * you can see exactly how much overhead our store operations add on
 * top of the unavoidable clone cost.
 *
 * Shapes tested: flat (3 keys), nested (2 levels), and a 50-item
 * array of objects. The 50-item case shows how clone cost scales
 * with collection size — this is why copyOnWritePath (structural
 * sharing) exists as a faster alternative for targeted mutations.
 *
 * N = 100,000 for small objects, N_SMALL = 10,000 for larger arrays.
 */

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
    const obj = { ...FLAT_INITIAL };
    bench('structuredClone baseline', 'structuredClone flat (3 keys)', N, () => {
      sink(structuredClone(obj));
    });
  }

  {
    const obj = structuredClone(NESTED_INITIAL);
    bench('structuredClone baseline', 'structuredClone nested', N, () => {
      sink(structuredClone(obj));
    });
  }

  {
    const obj = {
      items: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `v${String(i)}` })),
    };
    bench('structuredClone baseline', 'structuredClone 50-item array', N_SMALL, () => {
      sink(structuredClone(obj));
    });
  }
}
