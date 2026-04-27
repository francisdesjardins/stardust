/**
 * createStoreDispatch — dispatch indirection overhead.
 *
 * Each pair benchmarks the same operation via direct call and via dispatch,
 * isolating the single property lookup + spread cost of the indirection.
 */

import { createStore, createStoreDispatch } from '@stardust/core';
import { bench, group } from '../mitata.ts';

group('createStoreDispatch', () => {
  bench('update() — direct', function* () {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    yield () =>
      store.update((d) => {
        d.count += 1;
      });
  });

  bench('dispatch("update") — via dispatch', function* () {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, { builtin: ['update'] });
    yield () =>
      dispatch('update', (d) => {
        d.count += 1;
      });
  });

  bench('setByPath() — direct', function* () {
    const store = createStore({ user: { name: 'Alice' } }, () => ({}));
    let i = 0;
    yield () => store.setByPath('user.name', `name-${i++}`);
  });

  bench('dispatch("setByPath") — via dispatch', function* () {
    const store = createStore({ user: { name: 'Alice' } }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['setByPath'] });
    let i = 0;
    yield () => dispatch('setByPath', 'user.name', `name-${i++}`);
  });

  bench('domain method — direct', function* () {
    const store = createStore({ count: 0 }, ({ get }) => ({
      getCount(): number {
        return get().count;
      },
    }));
    yield () => store.getCount();
  });

  bench('dispatch("getCount") — via dispatch', function* () {
    const store = createStore({ count: 0 }, ({ get }) => ({
      getCount(): number {
        return get().count;
      },
    }));
    const dispatch = createStoreDispatch(store);
    yield () => dispatch('getCount');
  });

  bench('batch() — direct', function* () {
    const store = createStore({ count: 0 }, () => ({}));
    yield () => {
      store.batch(() => {
        store.setByPath('count', 1);
        store.setByPath('count', 2);
      });
    };
  });

  bench('dispatch("batch") — via dispatch', function* () {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['batch', 'setByPath'] });
    yield () => {
      dispatch('batch', () => {
        dispatch('setByPath', 'count', 1);
        dispatch('setByPath', 'count', 2);
      });
    };
  });
});
