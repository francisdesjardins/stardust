/**
 * createDerivedStore — read-only stores that recompute from source stores.
 *
 * Measures recompute cost (single/multi-source), equality skip (shallowEqual
 * returning true suppresses listener notification), fan-out scaling, and
 * subscribe/unsubscribe lifecycle. Sources are only subscribed while the
 * derived store has at least one listener (lazy).
 */

import { createDerivedStore, createStore, shallowEqual } from '@stardust/core';
import { bench, group } from '../mitata.ts';

group('createDerivedStore', () => {
  bench('single-source recompute (object)', function* () {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ count: get().count + 1 });
        },
      },
    }));
    const derived = createDerivedStore([counter], (c) => ({ doubled: c.count * 2 }), {
      equals: shallowEqual,
    });
    derived.subscribe(() => {});
    yield () => {
      counter.actions.tick();
      return derived.getSnapshot();
    };
  });

  bench('multi-source (3) recompute', function* () {
    const make = () =>
      createStore({ v: 0 }, ({ set, get }) => ({
        actions: {
          tick() {
            set({ v: get().v + 1 });
          },
        },
      }));
    const a = make();
    const b = make();
    const c = make();
    const derived = createDerivedStore([a, b, c], (sa, sb, sc) => ({ sum: sa.v + sb.v + sc.v }), {
      equals: shallowEqual,
    });
    derived.subscribe(() => {});
    let i = 0;
    const stores = [a, b, c];
    yield () => {
      stores[i % 3]?.actions.tick();
      i++;
      return derived.getSnapshot();
    };
  });

  bench('shallowEqual skip (no notify)', function* () {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ count: get().count + 1 });
        },
      },
    }));
    const label = createStore({ label: 'x' }, ({ set, get }) => ({
      actions: {
        toggle() {
          set({ label: get().label === 'x' ? 'y' : 'x' });
        },
      },
    }));
    const derived = createDerivedStore([counter, label], (c) => ({ doubled: c.count * 2 }), {
      equals: shallowEqual,
    });
    let notifyCount = 0;
    derived.subscribe(() => {
      notifyCount++;
    });
    yield () => {
      label.actions.toggle();
      return notifyCount;
    };
  });

  bench('fan-out: 1 listener (primitive)', function* () {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ count: get().count + 1 });
        },
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    derived.subscribe(() => {});
    yield () => {
      counter.actions.tick();
      return derived.getSnapshot();
    };
  });

  bench('fan-out: 10 listeners', function* () {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ count: get().count + 1 });
        },
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    for (let i = 0; i < 10; i++) {
      derived.subscribe(() => {});
    }
    yield () => {
      counter.actions.tick();
      return derived.getSnapshot();
    };
  });

  bench('fan-out: 100 listeners', function* () {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ count: get().count + 1 });
        },
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    for (let i = 0; i < 100; i++) {
      derived.subscribe(() => {});
    }
    yield () => {
      counter.actions.tick();
      return derived.getSnapshot();
    };
  });

  bench('fan-out: 1000 listeners', function* () {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      actions: {
        tick() {
          set({ count: get().count + 1 });
        },
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    for (let i = 0; i < 1_000; i++) {
      derived.subscribe(() => {});
    }
    yield () => {
      counter.actions.tick();
      return derived.getSnapshot();
    };
  });

  bench('subscribe + unsubscribe', function* () {
    const counter = createStore({ count: 0 }, () => ({ actions: {} }));
    const derived = createDerivedStore([counter], (c) => c.count);
    yield () => {
      const unsub = derived.subscribe(() => {});
      unsub();
    };
  });
});
