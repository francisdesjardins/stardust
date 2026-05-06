import { expect, test } from '@playwright/test';
import { createStore, createStoreSubscription, shallowEqual } from '..';

test.describe('createStoreSubscription', () => {
  test('getSnapshot returns the initial value', () => {
    const store = createStoreSubscription({ count: 0 });
    expect(store.getSnapshot()).toEqual({ count: 0 });
  });

  test('emit replaces the snapshot', () => {
    const store = createStoreSubscription({ count: 0 });
    store.emit({ count: 5 });
    expect(store.getSnapshot()).toEqual({ count: 5 });
  });

  test('getSnapshot always returns the latest emitted value', () => {
    const store = createStoreSubscription('a');
    store.emit('b');
    store.emit('c');
    expect(store.getSnapshot()).toBe('c');
  });

  test('getSnapshot returns the exact reference passed to emit', () => {
    const value = { x: 1 };
    const store = createStoreSubscription({ x: 0 });
    store.emit(value);
    expect(store.getSnapshot()).toBe(value);
  });

  test('subscribe returns an unsubscribe function', () => {
    const store = createStoreSubscription(0);
    const unsub = store.subscribe(() => {
      /* noop */
    });
    expect(typeof unsub).toBe('function');
  });

  test('subscribed listener is called on each emit', () => {
    const store = createStoreSubscription(0);
    let callCount = 0;
    store.subscribe(() => {
      callCount++;
    });
    store.emit(1);
    store.emit(2);
    expect(callCount).toBe(2);
  });

  test('unsubscribed listener is not called on subsequent emits', () => {
    const store = createStoreSubscription(0);
    let callCount = 0;
    const unsub = store.subscribe(() => {
      callCount++;
    });
    store.emit(1);
    unsub();
    store.emit(2);
    expect(callCount).toBe(1);
  });

  test('all active listeners are notified on emit', () => {
    const store = createStoreSubscription(0);
    const log: number[] = [];
    store.subscribe(() => {
      log.push(1);
    });
    store.subscribe(() => {
      log.push(2);
    });
    store.emit(99);
    expect(log).toEqual(expect.arrayContaining([1, 2]));
  });

  test('unsubscribing one listener does not affect others', () => {
    const store = createStoreSubscription(0);
    let a = 0;
    let b = 0;
    const unsub = store.subscribe(() => {
      a++;
    });
    store.subscribe(() => {
      b++;
    });
    unsub();
    store.emit(1);
    expect(a).toBe(0);
    expect(b).toBe(1);
  });
});

test.describe('createStore', () => {
  test('getSnapshot returns the initial snapshot', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    expect(store.getSnapshot()).toEqual({ count: 0 });
  });

  test('get() reads the current snapshot inside methods', () => {
    const store = createStore({ count: 5 }, ({ get }) => ({
      actions: {
        readCount() {
          return get().count;
        },
      },
    }));
    expect(store.actions.readCount()).toBe(5);
  });

  test('set() with an object replaces the snapshot and notifies', () => {
    const store = createStore({ count: 0 }, ({ set }) => ({
      actions: {
        reset() {
          set({ count: 0 });
        },
      },
    }));
    let notified = 0;
    store.subscribe(() => {
      notified++;
    });
    store.actions.reset();
    expect(store.getSnapshot()).toEqual({ count: 0 });
    expect(notified).toBe(1);
  });

  test('set() with an updater function receives previous snapshot', () => {
    const store = createStore({ count: 0 }, ({ set }) => ({
      actions: {
        increment() {
          set((prev) => ({ count: prev.count + 1 }));
        },
      },
    }));
    store.actions.increment();
    store.actions.increment();
    expect(store.getSnapshot()).toEqual({ count: 2 });
  });

  test('domain methods are accessible on the returned store', () => {
    const store = createStore({ value: '' }, ({ set }) => ({
      actions: {
        setValue(v: string) {
          set({ value: v });
        },
      },
    }));
    store.actions.setValue('hello');
    expect(store.getSnapshot()).toEqual({ value: 'hello' });
  });

  test('closure variables in methods builder are independent of snapshot', () => {
    const store = createStore({ count: 0 }, ({ get, set }) => {
      const callLog: number[] = [];
      return {
        actions: {
          increment() {
            set((prev) => ({ count: prev.count + 1 }));
            callLog.push(get().count);
          },
          getLog() {
            return callLog;
          },
        },
      };
    });
    store.actions.increment();
    store.actions.increment();
    expect(store.getSnapshot()).toEqual({ count: 2 });
    expect(store.actions.getLog()).toEqual([1, 2]);
  });

  test('subscribe returns an unsubscribe function', () => {
    const store = createStore(0, () => ({ actions: {} }));
    const unsub = store.subscribe(() => {
      /* noop */
    });
    expect(typeof unsub).toBe('function');
  });

  test('listeners are notified on set()', () => {
    const store = createStore({ n: 0 }, ({ set }) => ({
      actions: {
        bump() {
          set((s) => ({ n: s.n + 1 }));
        },
      },
    }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.actions.bump();
    store.actions.bump();
    expect(calls).toBe(2);
  });

  test('unsubscribed listener is not called', () => {
    const store = createStore(0, ({ set }) => ({
      actions: {
        setOne() {
          set(1);
        },
      },
    }));
    let calls = 0;
    const unsub = store.subscribe(() => {
      calls++;
    });
    unsub();
    store.actions.setOne();
    expect(calls).toBe(0);
  });

  test('update() applies a draft-based mutation and notifies', () => {
    const store = createStore({ count: 0, label: 'a' }, ({ update }) => ({
      actions: {
        increment() {
          update((draft) => {
            draft.count += 1;
          });
        },
      },
    }));
    store.actions.increment();
    store.actions.increment();
    expect(store.getSnapshot()).toEqual({ count: 2, label: 'a' });
  });

  test('update() does not mutate the previous snapshot', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((draft) => {
            draft.count += 1;
          });
        },
      },
    }));
    const before = store.getSnapshot();
    store.actions.increment();
    expect(before.count).toBe(0);
    expect(store.getSnapshot().count).toBe(1);
  });

  test('update() notifies listeners', () => {
    const store = createStore({ n: 0 }, ({ update }) => ({
      actions: {
        bump() {
          update((draft) => {
            draft.n += 1;
          });
        },
      },
    }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.actions.bump();
    store.actions.bump();
    expect(calls).toBe(2);
  });

  test('update() supports multiple field mutations in a single call', () => {
    const store = createStore({ x: 0, y: '', z: false }, ({ update }) => ({
      actions: {
        setAll() {
          update((draft) => {
            draft.x = 42;
            draft.y = 'hello';
            draft.z = true;
          });
        },
      },
    }));
    store.actions.setAll();
    expect(store.getSnapshot()).toEqual({ x: 42, y: 'hello', z: true });
  });

  test('getByPath returns a top-level key', () => {
    const store = createStore({ name: 'Alice' }, () => ({ actions: {} }));
    expect(store.getByPath('name')).toBe('Alice');
  });

  test('getByPath returns a nested key', () => {
    const store = createStore({ user: { name: 'Bob' } }, () => ({ actions: {} }));
    expect(store.getByPath('user.name')).toBe('Bob');
  });

  test('getByPath returns an array element', () => {
    const store = createStore({ items: ['a', 'b', 'c'] }, () => ({ actions: {} }));
    expect(store.getByPath('items[1]')).toBe('b');
  });

  test('getByPath returns an array element property', () => {
    const store = createStore({ things: [{ name: 'foo' }, { name: 'bar' }] }, () => ({
      actions: {},
    }));
    expect(store.getByPath('things[0].name')).toBe('foo');
  });

  test('getByPath returns undefined for a missing path', () => {
    const store = createStore({ a: { b: 1 } }, () => ({ actions: {} }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(store.getByPath('a.c' as any)).toBeUndefined();
  });

  test('setByPath updates a top-level key', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.setByPath('count', 42);
    expect(store.getSnapshot().count).toBe(42);
  });

  test('setByPath updates a nested key', () => {
    const store = createStore({ user: { name: 'Alice' } }, () => ({ actions: {} }));
    store.setByPath('user.name', 'Carol');
    expect(store.getSnapshot().user.name).toBe('Carol');
  });

  test('setByPath updates an array element property', () => {
    const store = createStore({ things: [{ name: 'foo' }] }, () => ({ actions: {} }));
    store.setByPath('things[0].name', 'baz');
    expect(store.getSnapshot().things[0]?.name).toBe('baz');
  });

  test('setByPath notifies listeners', () => {
    const store = createStore({ value: 0 }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.setByPath('value', 1);
    expect(calls).toBe(1);
  });

  test('setByPath does not mutate the previous snapshot', () => {
    const store = createStore({ value: 0 }, () => ({ actions: {} }));
    const before = store.getSnapshot();
    store.setByPath('value', 99);
    expect(before.value).toBe(0);
    expect(store.getSnapshot().value).toBe(99);
  });

  test('setByPath uses structural sharing — unchanged branches keep identity', () => {
    const store = createStore({ a: { x: 1 }, b: { y: 2 } }, () => ({ actions: {} }));
    const before = store.getSnapshot();
    store.setByPath('a.x', 99);
    const after = store.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.a).not.toBe(before.a); // changed branch
    expect(after.b).toBe(before.b); // unchanged branch keeps identity
  });

  // ── immutability & no-op ────────────────────────────────────────────────

  test('set() with object does not mutate the previous snapshot', () => {
    const store = createStore({ count: 0, label: 'a' }, ({ set }) => ({
      actions: {
        replace() {
          set({ count: 99, label: 'b' });
        },
      },
    }));
    const before = store.getSnapshot();
    store.actions.replace();
    expect(before.count).toBe(0);
    expect(before.label).toBe('a');
    expect(store.getSnapshot().count).toBe(99);
  });

  test('set() with updater does not mutate the previous snapshot', () => {
    const store = createStore({ count: 0 }, ({ set }) => ({
      actions: {
        increment() {
          set((prev) => ({ count: prev.count + 1 }));
        },
      },
    }));
    const before = store.getSnapshot();
    store.actions.increment();
    expect(before.count).toBe(0);
  });

  test('set() skips notification when resolved value is identical', () => {
    const store = createStore({ count: 0 }, ({ get, set }) => ({
      actions: {
        noop() {
          set(get());
        },
      },
    }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.actions.noop();
    expect(calls).toBe(0);
  });

  test('set() with updater skips notification when returning same reference', () => {
    const store = createStore({ count: 0 }, ({ set }) => ({
      actions: {
        noop() {
          set((prev) => prev);
        },
      },
    }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.actions.noop();
    expect(calls).toBe(0);
  });

  test('setByPath skips notification when value is identical', () => {
    const store = createStore({ count: 42 }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.setByPath('count', 42);
    expect(calls).toBe(0);
  });

  test('setByPath skips notification for identical nested value', () => {
    const store = createStore({ user: { name: 'Alice' } }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.setByPath('user.name', 'Alice');
    expect(calls).toBe(0);
    expect(store.getSnapshot().user.name).toBe('Alice');
  });

  test('setByPath preserves snapshot identity when value is identical', () => {
    const store = createStore({ a: 1, b: { c: 2 } }, () => ({ actions: {} }));
    const before = store.getSnapshot();
    store.setByPath('b.c', 2);
    expect(store.getSnapshot()).toBe(before);
  });

  // ── batch ──────────────────────────────────────────────────────────────

  test('batch() defers listener notification until fn completes', () => {
    const store = createStore({ count: 0 }, ({ set }) => ({
      actions: {
        setCount(n: number) {
          set({ count: n });
        },
      },
    }));
    const log: number[] = [];
    store.subscribe(() => {
      log.push(store.getSnapshot().count);
    });
    store.batch(() => {
      store.actions.setCount(1);
      store.actions.setCount(2);
      store.actions.setCount(3);
    });
    // Only one notification with the final value
    expect(log).toEqual([3]);
  });

  test('batch() get() returns the latest value during batch', () => {
    const store = createStore({ count: 0 }, ({ get, set }) => ({
      actions: {
        incrementTwice() {
          set({ count: get().count + 1 });
          set({ count: get().count + 1 });
        },
      },
    }));
    store.batch(() => {
      store.actions.incrementTwice();
    });
    expect(store.getSnapshot().count).toBe(2);
  });

  test('batch() does not notify when no mutations happen', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.batch(() => {
      // no mutations
    });
    expect(calls).toBe(0);
  });

  test('batch() supports nesting — notifies only after outermost batch', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    const log: number[] = [];
    store.subscribe(() => {
      log.push(store.getSnapshot().count);
    });
    store.batch(() => {
      store.setByPath('count', 1);
      store.batch(() => {
        store.setByPath('count', 2);
      });
      store.setByPath('count', 3);
    });
    expect(log).toEqual([3]);
  });

  test('batch() works with setByPath, set, and update together', () => {
    const store = createStore({ a: 0, b: '', c: false }, ({ update }) => ({
      actions: {
        toggleC() {
          update((d) => {
            d.c = !d.c;
          });
        },
      },
    }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.batch(() => {
      store.setByPath('a', 42);
      store.setByPath('b', 'hello');
      store.actions.toggleC();
    });
    expect(calls).toBe(1);
    expect(store.getSnapshot()).toEqual({ a: 42, b: 'hello', c: true });
  });

  test('batch() is available on StoreApi inside methods builder', () => {
    const store = createStore({ count: 0 }, ({ set, batch }) => ({
      actions: {
        setMany(values: number[]) {
          batch(() => {
            for (const v of values) {
              set({ count: v });
            }
          });
        },
      },
    }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.actions.setMany([1, 2, 3]);
    expect(calls).toBe(1);
    expect(store.getSnapshot().count).toBe(3);
  });

  // ── store-level set() and update() ─────────────────────────────────────

  test('store.set() replaces the snapshot directly', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.set({ count: 42 });
    expect(store.getSnapshot()).toEqual({ count: 42 });
  });

  test('store.set() with updater function', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.set((prev) => ({ count: prev.count + 10 }));
    expect(store.getSnapshot().count).toBe(10);
  });

  test('store.set() notifies listeners', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.set({ count: 1 });
    expect(calls).toBe(1);
  });

  test('store.set() skips notification for identical value', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.set(store.getSnapshot());
    expect(calls).toBe(0);
  });

  test('store.update() applies draft mutation directly', () => {
    const store = createStore({ count: 0, label: 'a' }, () => ({ actions: {} }));
    store.update((d) => {
      d.count = 5;
      d.label = 'b';
    });
    expect(store.getSnapshot()).toEqual({ count: 5, label: 'b' });
  });

  test('store.update() notifies listeners', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.update((d) => {
      d.count = 1;
    });
    expect(calls).toBe(1);
  });

  // ── equals option ──────────────────────────────────────────────────────

  test('set() uses Object.is by default — NaN is equal to NaN', () => {
    const store = createStore(NaN, ({ set }) => ({
      actions: {
        setNaN() {
          set(NaN);
        },
      },
    }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.actions.setNaN();
    expect(calls).toBe(0);
  });

  test('set() with custom equals suppresses notification', () => {
    const store = createStore(
      { count: 0 },
      ({ set }) => ({
        actions: {
          replace(n: number) {
            set({ count: n });
          },
        },
      }),
      { equals: shallowEqual }
    );
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    // New object, same values — shallowEqual suppresses
    store.actions.replace(0);
    expect(calls).toBe(0);
    // Different value — notifies
    store.actions.replace(1);
    expect(calls).toBe(1);
  });

  test('update() with custom equals suppresses no-op mutations', () => {
    const store = createStore(
      { count: 0 },
      ({ update }) => ({
        actions: {
          noop() {
            update(() => {
              // no changes
            });
          },
          increment() {
            update((d) => {
              d.count += 1;
            });
          },
        },
      }),
      { equals: shallowEqual }
    );
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.actions.noop();
    // structuredClone creates new ref, but shallowEqual sees same values
    expect(calls).toBe(0);
    store.actions.increment();
    expect(calls).toBe(1);
  });

  // ── reset() ─────────────────────────────────────────────────────────────

  test('reset() restores the initial snapshot', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    store.actions.increment();
    store.actions.increment();
    expect(store.getSnapshot().count).toBe(2);
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 0 });
  });

  test('reset() notifies subscribers', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.set({ count: 5 });
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.reset();
    expect(calls).toBe(1);
  });

  test('reset() is independent of subsequent mutations — initial snapshot is frozen at creation', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    store.actions.increment();
    store.reset();
    store.actions.increment();
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 0 });
  });

  test('reset() is callable from a store method via StoreApi', () => {
    const store = createStore({ count: 3 }, ({ reset }) => ({
      actions: {
        clear() {
          reset();
        },
      },
    }));
    store.set({ count: 99 });
    store.actions.clear();
    expect(store.getSnapshot()).toEqual({ count: 3 });
  });

  test('reset() inside batch() defers notification until batch completes', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.set({ count: 5 });
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.batch(() => {
      store.set({ count: 99 });
      store.reset();
    });
    expect(store.getSnapshot()).toEqual({ count: 0 });
    expect(calls).toBe(1);
  });

  test('domain method named reset() calling api.reset() does not infinitely recurse', () => {
    // Regression: api.reset previously forwarded through store.reset at call time.
    // Object.assign(store, domainMethods) overwrites store.reset with the domain
    // method, so domain reset() → api.reset() → store.reset() → domain reset() → …
    const store = createStore({ count: 5, flag: true }, ({ reset }) => ({
      actions: {
        reset() {
          reset(); // built-in api.reset — must not recurse back to this method
        },
      },
    }));
    store.set({ count: 99, flag: false });
    // Must not throw "Maximum call stack size exceeded"
    expect(() => {
      store.actions.reset();
    }).not.toThrow();
    expect(store.getSnapshot()).toEqual({ count: 5, flag: true });
  });

  test('reset(newSnapshot) commits the value and updates the baseline', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.set({ count: 5 });
    store.reset({ count: 10 });
    expect(store.getSnapshot()).toEqual({ count: 10 });
    // Bare reset() should now restore to count:10, not count:0
    store.set({ count: 99 });
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 10 });
  });

  test('reset(updater fn) receives current baseline and updates it', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.set({ count: 5 });
    store.reset((initial) => ({ count: initial.count + 1 }));
    // initial is the original baseline (count: 0), so result is count: 1
    expect(store.getSnapshot()).toEqual({ count: 1 });
    // Bare reset() should now restore to count:1
    store.set({ count: 99 });
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 1 });
  });

  test('reset(newSnapshot) baseline is independent of external mutations', () => {
    const newState = { count: 42 };
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.reset(newState);
    newState.count = 99; // mutate the original — baseline should be unaffected
    store.set({ count: 0 });
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 42 });
  });

  test('reset(newSnapshot) notifies subscribers', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    store.reset({ count: 5 });
    expect(calls).toBe(1);
  });
});

test.describe('createStoreSubscription — equals option', () => {
  test('emit skips notification when equals returns true', () => {
    const sub = createStoreSubscription({ x: 1 }, { equals: shallowEqual });
    let calls = 0;
    sub.subscribe(() => {
      calls++;
    });
    // New object, same values — shallowEqual suppresses
    sub.emit({ x: 1 });
    expect(calls).toBe(0);
    expect(sub.getSnapshot()).toEqual({ x: 1 });
  });

  test('emit notifies when equals returns false', () => {
    const sub = createStoreSubscription({ x: 1 }, { equals: shallowEqual });
    let calls = 0;
    sub.subscribe(() => {
      calls++;
    });
    sub.emit({ x: 2 });
    expect(calls).toBe(1);
    expect(sub.getSnapshot()).toEqual({ x: 2 });
  });

  test('emit uses Object.is by default — handles NaN', () => {
    const sub = createStoreSubscription(NaN);
    let calls = 0;
    sub.subscribe(() => {
      calls++;
    });
    sub.emit(NaN);
    expect(calls).toBe(0);
  });

  test('emit with Object.is default notifies on different values', () => {
    const sub = createStoreSubscription(0);
    let calls = 0;
    sub.subscribe(() => {
      calls++;
    });
    sub.emit(1);
    expect(calls).toBe(1);
  });

  test('emit does not update snapshot when equals returns true', () => {
    const original = { x: 1 };
    const sub = createStoreSubscription(original, { equals: shallowEqual });
    const duplicate = { x: 1 };
    sub.emit(duplicate);
    // Snapshot should still be the original reference
    expect(sub.getSnapshot()).toBe(original);
  });
});

test.describe('createStore — deepClone option', () => {
  test('update() uses custom deepClone instead of structuredClone', () => {
    const cloneCalls: unknown[] = [];
    const customClone = <T>(v: T): T => {
      cloneCalls.push(v);
      return structuredClone(v);
    };

    const store = createStore({ count: 0 }, () => ({ actions: {} }), { deepClone: customClone });
    store.update((d) => {
      d.count = 1;
    });

    expect(cloneCalls.length).toBeGreaterThanOrEqual(1);
    expect(store.getSnapshot()).toEqual({ count: 1 });
  });

  test('reset() uses custom deepClone for baseline storage and restoration', () => {
    const cloneCalls: unknown[] = [];
    const customClone = <T>(v: T): T => {
      cloneCalls.push(v);
      return structuredClone(v);
    };

    const store = createStore({ count: 0 }, () => ({ actions: {} }), { deepClone: customClone });
    // At creation the baseline is cloned once
    const callsAfterCreate = cloneCalls.length;

    store.update((d) => {
      d.count = 5;
    });
    store.reset();

    expect(cloneCalls.length).toBeGreaterThan(callsAfterCreate);
    expect(store.getSnapshot()).toEqual({ count: 0 });
  });

  test('reset(newSnapshot) stores new baseline via custom deepClone', () => {
    const cloneCalls: unknown[] = [];
    const customClone = <T>(v: T): T => {
      cloneCalls.push(v);
      return structuredClone(v);
    };

    const store = createStore({ count: 0 }, () => ({ actions: {} }), { deepClone: customClone });
    store.reset({ count: 10 });
    // Bare reset should now restore to 10
    store.update((d) => {
      d.count = 99;
    });
    store.reset();

    expect(store.getSnapshot()).toEqual({ count: 10 });
  });
});

test.describe('createStore — context option', () => {
  test('getContext() returns the value passed at creation', () => {
    type Ctx = { multiplier: number };
    const store = createStore<{ price: number }, { total: () => number }, Ctx>(
      { price: 10 },
      ({ get, getContext }) => ({
        actions: {
          total() {
            return get().price * getContext().multiplier;
          },
        },
      }),
      { context: { multiplier: 5 } }
    );

    expect(store.actions.total()).toBe(50);
  });

  test('setContext() overwrites the initial context', () => {
    type Ctx = { multiplier: number };
    const store = createStore<{ price: number }, { total: () => number }, Ctx>(
      { price: 100 },
      ({ get, getContext }) => ({
        actions: {
          total() {
            return get().price * getContext().multiplier;
          },
        },
      }),
      { context: { multiplier: 2 } }
    );

    store.setContext({ multiplier: 3 });
    expect(store.actions.total()).toBe(300);
  });

  test('getContext() returns undefined when no context option is provided', () => {
    type Ctx = { taxRate: number };
    let captured: Ctx | undefined;
    const store = createStore<{ price: number }, { capture: () => void }, Ctx>(
      { price: 100 },
      ({ getContext }) => ({
        actions: {
          capture() {
            captured = getContext();
          },
        },
      })
    );

    store.actions.capture();
    expect(captured).toBeUndefined();
  });
});

test.describe('createStoreSubscription — listenerCount', () => {
  test('listenerCount is 0 with no subscribers', () => {
    const sub = createStoreSubscription(0);
    expect(sub.listenerCount).toBe(0);
  });

  test('listenerCount is 1 after one subscribe call', () => {
    const sub = createStoreSubscription(0);
    sub.subscribe(() => {});
    expect(sub.listenerCount).toBe(1);
  });

  test('listenerCount increments with multiple concurrent subscribers', () => {
    const sub = createStoreSubscription(0);
    sub.subscribe(() => {});
    sub.subscribe(() => {});
    expect(sub.listenerCount).toBe(2);
  });

  test('listenerCount returns to 0 after all unsubscribes', () => {
    const sub = createStoreSubscription(0);
    const unsub1 = sub.subscribe(() => {});
    const unsub2 = sub.subscribe(() => {});
    unsub1();
    unsub2();
    expect(sub.listenerCount).toBe(0);
  });

  test('listenerCount decrements correctly when only one of two subscribers unsubscribes', () => {
    const sub = createStoreSubscription(0);
    const unsub1 = sub.subscribe(() => {});
    sub.subscribe(() => {});
    unsub1();
    expect(sub.listenerCount).toBe(1);
  });
});

test.describe('createStore — listenerCount', () => {
  test('listenerCount is 0 with no subscribers', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    expect(store.listenerCount).toBe(0);
  });

  test('listenerCount is 1 after one subscribe call', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.subscribe(() => {});
    expect(store.listenerCount).toBe(1);
  });

  test('listenerCount increments with multiple concurrent subscribers', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    store.subscribe(() => {});
    store.subscribe(() => {});
    expect(store.listenerCount).toBe(2);
  });

  test('listenerCount returns to 0 after all unsubscribes', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    const unsub1 = store.subscribe(() => {});
    const unsub2 = store.subscribe(() => {});
    unsub1();
    unsub2();
    expect(store.listenerCount).toBe(0);
  });

  test('listenerCount decrements correctly when only one of two subscribers unsubscribes', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    const unsub1 = store.subscribe(() => {});
    store.subscribe(() => {});
    unsub1();
    expect(store.listenerCount).toBe(1);
  });
});
