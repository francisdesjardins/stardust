import { expect, test } from '@playwright/test';
import { createStore, shallowEqual, watch } from '..';

test.describe('watch', () => {
  test('bare callback fires with (next, prev) on mutation', () => {
    const store = createStore({ count: 0 }, ({ set }) => ({
      setCount(n: number) {
        set({ count: n });
      },
    }));

    const calls: Array<[{ count: number }, { count: number }]> = [];
    watch(store, (next, prev) => {
      calls.push([next, prev]);
    });

    store.setCount(1);
    store.setCount(2);

    expect(calls.length).toBe(2);
    expect(calls[0]).toEqual([{ count: 1 }, { count: 0 }]);
    expect(calls[1]).toEqual([{ count: 2 }, { count: 1 }]);
  });

  test('selector fires only when the selected slice changes', () => {
    const store = createStore({ count: 0, label: 'a' }, ({ set }) => ({
      setCount(n: number) {
        set({ count: n, label: 'a' });
      },
      setLabel(l: string) {
        set({ count: 0, label: l });
      },
    }));

    const calls: number[] = [];
    watch(
      store,
      (s) => s.count,
      (next) => {
        calls.push(next);
      }
    );

    store.setLabel('b'); // label changes, count stays 0 — no callback
    store.setCount(5); // count changes — callback fires

    expect(calls).toEqual([5]);
  });

  test('equals option suppresses spurious callbacks', () => {
    const store = createStore({ x: 1, y: 2 }, ({ update }) => ({
      touch() {
        update(() => {
          // no-op but update() clones, producing a new object ref
        });
      },
      move(x: number, y: number) {
        update((d) => {
          d.x = x;
          d.y = y;
        });
      },
    }));

    const calls: Array<{ x: number; y: number }> = [];
    watch(
      store,
      (s) => ({ x: s.x, y: s.y }),
      (next) => {
        calls.push(next);
      },
      { equals: shallowEqual }
    );

    store.touch(); // same values, shallowEqual → suppressed
    store.move(10, 20); // different values → fires

    expect(calls.length).toBe(1);
    expect(calls[0]).toEqual({ x: 10, y: 20 });
  });

  test('returned unsubscribe stops future callbacks', () => {
    const store = createStore({ count: 0 }, ({ set }) => ({
      setCount(n: number) {
        set({ count: n });
      },
    }));

    const calls: number[] = [];
    const unsub = watch(
      store,
      (s) => s.count,
      (next) => {
        calls.push(next);
      }
    );

    store.setCount(1);
    unsub();
    store.setCount(2); // should not fire

    expect(calls).toEqual([1]);
  });

  test('does not fire before the first mutation', () => {
    const store = createStore({ count: 0 }, () => ({}));

    const calls: number[] = [];
    watch(
      store,
      (s) => s.count,
      (next) => {
        calls.push(next);
      }
    );

    expect(calls).toEqual([]);
  });
});
