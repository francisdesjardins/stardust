/**
 * watch — non-React store observer.
 *
 * watch(store, selector?, callback) fires callback(next, prev) only when
 * the observed value changes. Each emission goes through:
 * selector(snapshot) → equality check → callback (if changed).
 */

import { createStore, shallowEqual, watch } from '@stardust/core';
import { bench, group } from '../mitata.ts';

type Flat = { count: number; label: string; active: boolean };
const FLAT_INITIAL: Flat = { count: 0, label: 'bench', active: true };

group('watch', () => {
  bench('watch full snapshot (no selector)', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ ...get(), count: get().count + 1 });
        },
      },
    }));
    let calls = 0;
    watch(store, () => {
      calls++;
    });
    yield () => {
      store.actions.tick();
      return calls;
    };
  });

  bench('watch selector — primitive field', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ ...get(), count: get().count + 1 });
        },
      },
    }));
    let calls = 0;
    watch(
      store,
      (s) => s.count,
      () => {
        calls++;
      }
    );
    yield () => {
      store.actions.tick();
      return calls;
    };
  });

  bench('watch selector + shallowEqual', function* () {
    const store = createStore({ ...FLAT_INITIAL }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ ...get(), count: get().count + 1 });
        },
      },
    }));
    let calls = 0;
    watch(
      store,
      (s) => ({ count: s.count, label: s.label }),
      () => {
        calls++;
      },
      { equals: shallowEqual }
    );
    yield () => {
      store.actions.tick();
      return calls;
    };
  });

  bench('watch subscribe + unsubscribe', function* () {
    const store = createStore({ count: 0 });
    yield () => {
      const unsub = watch(
        store,
        (s) => s.count,
        () => {}
      );
      unsub();
    };
  });

  bench('watch callback suppressed (no change)', function* () {
    const store = createStore({ count: 0, label: 'x' }, ({ set, get }) => ({
      actions: {
        toggleLabel() {
          set({ ...get(), label: get().label === 'x' ? 'y' : 'x' });
        },
      },
    }));
    let calls = 0;
    watch(
      store,
      (s) => s.count,
      () => {
        calls++;
      }
    );
    yield () => {
      store.actions.toggleLabel();
      return calls;
    };
  });
});
