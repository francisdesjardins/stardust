/**
 * structuredClone baseline — reference cost for deep-copy operations.
 *
 * The floor cost for any operation that needs a full independent copy
 * (produce, update). Comparing against these numbers shows the overhead
 * our store operations add on top of the unavoidable clone cost.
 */

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

group('structuredClone baseline', () => {
  bench('structuredClone flat (3 keys)', function* () {
    const obj = { ...FLAT_INITIAL };
    yield () => structuredClone(obj);
  });

  bench('structuredClone nested', function* () {
    const obj = structuredClone(NESTED_INITIAL);
    yield () => structuredClone(obj);
  });

  bench('structuredClone 50-item array', function* () {
    const obj = {
      items: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `v${String(i)}` })),
    };
    yield () => structuredClone(obj);
  });
});
