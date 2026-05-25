/**
 * End-to-end: store update + listener notification.
 *
 * Full cost as a React component would experience it: mutation → clone →
 * snapshot replacement → subscriber callbacks. Scaling axis: listener count
 * and write method (update() vs setByPath).
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

group('End-to-end: store + listeners', () => {
  bench('update() + 1 listener', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    store.subscribe(() => {});
    yield () => store.actions.increment();
  });

  bench('update() + 10 listeners', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    for (let i = 0; i < 10; i++) {
      store.subscribe(() => {});
    }
    yield () => store.actions.increment();
  });

  bench('setByPath + 10 listeners nested', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL));
    for (let i = 0; i < 10; i++) {
      store.subscribe(() => {});
    }
    yield () => store.setByPath('user.address.city', 'Vancouver');
  });
});
