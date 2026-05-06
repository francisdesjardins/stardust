/**
 * createStore — update() uses structuredClone + mutate internally.
 *
 * The ergonomic but slower path — compare with "structuredClone baseline"
 * to see the clone overhead, and "createStore — get / set" for the
 * zero-clone alternative.
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

group('createStore — update', () => {
  bench('update() single field flat', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    yield () => store.actions.increment();
  });

  bench('update() multi-field flat', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ update }) => ({
      actions: {
        mutateAll() {
          update((d) => {
            d.count += 1;
            d.label = 'changed';
            d.active = !d.active;
          });
        },
      },
    }));
    yield () => store.actions.mutateAll();
  });

  bench('update() deeply nested', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL), ({ update }) => ({
      actions: {
        changeCity() {
          update((d) => {
            d.user.address.city = 'Vancouver';
          });
        },
      },
    }));
    yield () => store.actions.changeCity();
  });

  bench('update() array push (reset each)', function* () {
    const store = createStore({ items: [1, 2, 3] }, ({ update }) => ({
      actions: {
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
      },
    }));
    yield () => {
      store.actions.push();
      store.actions.reset();
    };
  });
});
