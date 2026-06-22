/**
 * createStoreDispatch — dispatch indirection overhead.
 *
 * Each pair benchmarks the same operation via direct call and via dispatch,
 * isolating the single property lookup + spread cost of the indirection.
 */

import { createStore, createStoreDispatch } from '@stardust/core';
import { bench, group } from '../mitata.ts';

group('createStoreDispatch', () => {
  bench('increment() — direct', function* () {
    const store = createStore({ count: 0 }, ({ update }) => ({
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

  bench('dispatch("increment") — via dispatch', function* () {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    const dispatch = createStoreDispatch(store);
    yield () => dispatch('increment');
  });

  bench('domain method — direct', function* () {
    const store = createStore({ count: 0 }, ({ get }) => ({
      actions: {
        getCount(): number {
          return get().count;
        },
      },
    }));
    yield () => store.actions.getCount();
  });

  bench('dispatch("getCount") — via dispatch', function* () {
    const store = createStore({ count: 0 }, ({ get }) => ({
      actions: {
        getCount(): number {
          return get().count;
        },
      },
    }));
    const dispatch = createStoreDispatch(store);
    yield () => dispatch('getCount');
  });
});
