/**
 * createStoreDispatch — dispatch indirection overhead.
 *
 * Measures the cost of routing through `dispatch(action, ...args)` versus
 * calling the store method directly. The dispatch function does a single
 * property lookup + spread — this benchmark quantifies that overhead.
 *
 * Each pair benchmarks the same operation via direct call and via dispatch,
 * so the difference isolates the dispatch indirection cost.
 *
 * N = 100,000 iterations per benchmark.
 */

import { createStore, createStoreDispatch } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

const GROUP = 'createStoreDispatch';

const N = 100_000;

export function register(bench: Bench): void {
  // ── update: direct vs dispatch ──────────────────────────────────────────

  {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    bench(GROUP, 'update() — direct', N, () => {
      store.update((d) => {
        d.count += 1;
      });
    });
  }

  {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, { builtin: ['update'] });
    bench(GROUP, 'dispatch("update") — via dispatch', N, () => {
      dispatch('update', (d) => {
        d.count += 1;
      });
    });
  }

  // ── setByPath: direct vs dispatch ───────────────────────────────────────

  {
    const store = createStore({ user: { name: 'Alice' } }, () => ({}));
    let i = 0;
    bench(GROUP, 'setByPath() — direct', N, () => {
      store.setByPath('user.name', `name-${i++}`);
    });
  }

  {
    const store = createStore({ user: { name: 'Alice' } }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['setByPath'] });
    let i = 0;
    bench(GROUP, 'dispatch("setByPath") — via dispatch', N, () => {
      dispatch('setByPath', 'user.name', `name-${i++}`);
    });
  }

  // ── domain method: direct vs dispatch ───────────────────────────────────

  {
    const store = createStore({ count: 0 }, ({ get }) => ({
      getCount(): number {
        return get().count;
      },
    }));
    bench(GROUP, 'domain method — direct', N, () => {
      sink(store.getCount());
    });
  }

  {
    const store = createStore({ count: 0 }, ({ get }) => ({
      getCount(): number {
        return get().count;
      },
    }));
    const dispatch = createStoreDispatch(store);
    bench(GROUP, 'dispatch("getCount") — via dispatch', N, () => {
      sink(dispatch('getCount'));
    });
  }

  // ── batch: direct vs dispatch ───────────────────────────────────────────

  {
    const store = createStore({ count: 0 }, () => ({}));
    bench(GROUP, 'batch() — direct', N, () => {
      store.batch(() => {
        store.setByPath('count', 1);
        store.setByPath('count', 2);
      });
    });
  }

  {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['batch', 'setByPath'] });
    bench(GROUP, 'dispatch("batch") — via dispatch', N, () => {
      dispatch('batch', () => {
        dispatch('setByPath', 'count', 1);
        dispatch('setByPath', 'count', 2);
      });
    });
  }
}
