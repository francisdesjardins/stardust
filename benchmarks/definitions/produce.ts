/**
 * produce — Immer-style immutable updates via structuredClone + mutation.
 *
 * produce(state, recipe) deep-clones entire state, passes the clone to the
 * recipe for mutation, returns the mutated clone. Full structuredClone cost
 * on every call — compare with "copyOnWritePath" for targeted mutations.
 */

import { produce } from '@stardust/core';
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

group('produce', () => {
  bench('produce flat single-field', function* () {
    const state = { ...FLAT_INITIAL };
    yield () =>
      produce(state, (d) => {
        d.count = 1;
      });
  });

  bench('produce flat all-fields', function* () {
    const state = { ...FLAT_INITIAL };
    yield () =>
      produce(state, (d) => {
        d.count = 1;
        d.label = 'changed';
        d.active = false;
      });
  });

  bench('produce nested', function* () {
    const state = structuredClone(NESTED_INITIAL);
    yield () =>
      produce(state, (d) => {
        d.user.address.city = 'Vancouver';
      });
  });

  bench('produce array push + pop', function* () {
    const state = { items: [1, 2, 3, 4, 5] };
    yield () =>
      produce(state, (d) => {
        d.items.push(99);
        d.items.pop();
      });
  });

  bench('produce 20-key flat', function* () {
    const state: Record<string, number> = {};
    for (let i = 0; i < 20; i++) state[`key${String(i)}`] = i;
    yield () =>
      produce(state, (d) => {
        d['key0'] = 999;
      });
  });

  bench('produce 50-item array', function* () {
    const state = {
      items: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `v${String(i)}` })),
    };
    yield () =>
      produce(state, (d) => {
        const item = d.items[0];
        if (item) item.value = 'changed';
      });
  });
});
