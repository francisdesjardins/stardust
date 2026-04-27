import { expect, test } from '@playwright/test';
import { createStore, createStoreDispatch } from '..';

test.describe('createStoreDispatch', () => {
  // ── Built-in: update ────────────────────────────────────────────────────

  test('dispatch("update") applies draft mutation', () => {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['update'] });
    dispatch('update', (d) => {
      d.count = 5;
    });
    expect(store.getSnapshot().count).toBe(5);
  });

  // ── Built-in: set ──────────────────────────────────────────────────────

  test('dispatch("set") replaces the snapshot', () => {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['set'] });
    dispatch('set', { count: 42 });
    expect(store.getSnapshot()).toEqual({ count: 42 });
  });

  test('dispatch("set") with updater function', () => {
    const store = createStore({ count: 10 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['set'] });
    dispatch('set', (prev) => ({ count: prev.count + 5 }));
    expect(store.getSnapshot().count).toBe(15);
  });

  // ── Built-in: setByPath ────────────────────────────────────────────────

  test('dispatch("setByPath") writes at path with structural sharing', () => {
    const store = createStore({ a: 1, b: { c: 2 } }, () => ({}));
    const before = store.getSnapshot();
    const dispatch = createStoreDispatch(store, { builtin: ['setByPath'] });
    dispatch('setByPath', 'a', 99);
    const after = store.getSnapshot();
    expect(after.a).toBe(99);
    // Structural sharing: unchanged branch keeps identity
    expect(after.b).toBe(before.b);
  });

  // ── Built-in: batch ────────────────────────────────────────────────────

  test('dispatch("batch") coalesces notifications', () => {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['batch', 'setByPath'] });
    let calls = 0;
    store.subscribe(() => {
      calls++;
    });
    dispatch('batch', () => {
      dispatch('setByPath', 'count', 1);
      dispatch('setByPath', 'count', 2);
      dispatch('setByPath', 'count', 3);
    });
    expect(calls).toBe(1);
    expect(store.getSnapshot().count).toBe(3);
  });

  // ── Built-in: getByPath ────────────────────────────────────────────────

  test('dispatch("getByPath") returns correct value', () => {
    const store = createStore({ user: { name: 'Alice' } }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['getByPath'] });
    const name = dispatch('getByPath', 'user.name');
    expect(name).toBe('Alice');
  });

  // ── Domain method: sync ────────────────────────────────────────────────

  test('dispatch passes through sync return value', () => {
    const store = createStore({ count: 0 }, ({ get }) => ({
      getCount(): number {
        return get().count;
      },
      increment() {
        // no return
      },
    }));
    const dispatch = createStoreDispatch(store);
    store.set({ count: 7 });
    const result = dispatch('getCount');
    expect(result).toBe(7);
  });

  // ── Domain method: async ───────────────────────────────────────────────

  test('dispatch passes through async return value', async () => {
    const store = createStore({ data: '' }, ({ update }) => ({
      async fetchData(value: string): Promise<string> {
        await Promise.resolve();
        update((d) => {
          d.data = value;
        });
        return value;
      },
    }));
    const dispatch = createStoreDispatch(store);
    const result = await dispatch('fetchData', 'hello');
    expect(result).toBe('hello');
    expect(store.getSnapshot().data).toBe('hello');
  });

  // ── Context-threaded dispatch ──────────────────────────────────────────

  test('dispatch passed as context to another store', () => {
    type OuterState = { value: number };
    type OuterMethods = { increment: () => void };

    const outer = createStore<OuterState, OuterMethods>({ value: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.value += 1;
        });
      },
    }));

    const outerDispatch = createStoreDispatch(outer);

    // Inner store receives dispatch as context
    type InnerDispatch = typeof outerDispatch;
    const inner = createStore<{ triggered: boolean }, { triggerOuter: () => void }, InnerDispatch>(
      { triggered: false },
      ({ update, getContext }) => ({
        triggerOuter() {
          const dispatch = getContext();
          dispatch('increment');
          update((d) => {
            d.triggered = true;
          });
        },
      })
    );
    inner.setContext(outerDispatch);

    inner.triggerOuter();
    expect(outer.getSnapshot().value).toBe(1);
    expect(inner.getSnapshot().triggered).toBe(true);
  });

  // ── Sequential dispatches ──────────────────────────────────────────────

  test('multiple sequential dispatches accumulate state', () => {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['update'] });
    dispatch('update', (d: { count: number }) => {
      d.count += 1;
    });
    dispatch('update', (d: { count: number }) => {
      d.count += 1;
    });
    dispatch('update', (d: { count: number }) => {
      d.count += 1;
    });
    expect(store.getSnapshot().count).toBe(3);
  });

  // ── Invalid action ─────────────────────────────────────────────────────

  test('dispatch throws on unknown action', () => {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store);
    expect(() => {
      // @ts-expect-error — intentionally dispatching unknown action
      dispatch('nonExistent');
    }).toThrow('dispatch: unknown action "nonExistent"');
  });

  // ── domain option ──────────────────────────────────────────────────────

  test('domain option: permitted action dispatches successfully', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
      reset() {
        update((d) => {
          d.count = 0;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, { domain: ['increment'] });
    dispatch('increment');
    expect(store.getSnapshot().count).toBe(1);
  });

  test('domain option: disallowed action throws at runtime', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
      reset() {
        update((d) => {
          d.count = 0;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, { domain: ['increment'] });
    expect(() => {
      // @ts-expect-error — 'reset' not in domain option
      dispatch('reset');
    }).toThrow('dispatch: action "reset" is not in the allowed set');
  });

  test('builtin option: built-ins are opt-in', () => {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: ['update'] });
    dispatch('update', (d: { count: number }) => {
      d.count = 99;
    });
    expect(store.getSnapshot().count).toBe(99);
    // 'set' is not in builtin option — throws at runtime even if TMethods={} blurs the type
    expect(() => {
      (dispatch as (a: string, ...r: unknown[]) => unknown)('set', { count: 0 });
    }).toThrow('dispatch: action "set" is not in the allowed set');
  });

  test('domain option: restricted dispatch passed as store context', () => {
    const outer = createStore({ value: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.value += 1;
        });
      },
      decrement() {
        update((d) => {
          d.value -= 1;
        });
      },
    }));

    // Only 'increment' exposed — inner store cannot call 'decrement'
    const outerDispatch = createStoreDispatch(outer, { domain: ['increment'] });
    type OuterDispatch = typeof outerDispatch;

    const inner = createStore<{ triggered: boolean }, { run: () => void }, OuterDispatch>(
      { triggered: false },
      ({ update, getContext }) => ({
        run() {
          getContext()('increment');
          update((d) => {
            d.triggered = true;
          });
        },
      })
    );
    inner.setContext(outerDispatch);

    inner.run();
    expect(outer.getSnapshot().value).toBe(1);
    expect(inner.getSnapshot().triggered).toBe(true);
  });

  // ── builtin: true ──────────────────────────────────────────────────────

  test('builtin: true allows all built-in methods', () => {
    const store = createStore({ count: 0 }, () => ({}));
    const dispatch = createStoreDispatch(store, { builtin: true });
    dispatch('set', { count: 1 });
    dispatch('update', (d) => {
      d.count += 10;
    });
    expect(store.getSnapshot().count).toBe(11);
  });

  test('builtin: true with domain default allows all domain methods', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, { builtin: true });
    dispatch('increment');
    dispatch('set', { count: 5 });
    expect(store.getSnapshot().count).toBe(5);
  });

  // ── domain: true ───────────────────────────────────────────────────────

  test('domain: true allows all domain methods, no builtins', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
      decrement() {
        update((d) => {
          d.count -= 1;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, { domain: true });
    dispatch('increment');
    dispatch('decrement');
    expect(store.getSnapshot().count).toBe(0);
    expect(() => {
      // @ts-expect-error — 'set' is not in domain
      dispatch('set', { count: 99 });
    }).toThrow('dispatch: action "set" is not in the allowed set');
  });

  // ── mixed builtin + domain ─────────────────────────────────────────────

  test('builtin + domain arrays allow only listed keys from each category', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
      reset() {
        update((d) => {
          d.count = 0;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, {
      builtin: ['update'],
      domain: ['increment'],
    });
    dispatch('increment');
    dispatch('update', (d: { count: number }) => {
      d.count += 10;
    });
    expect(store.getSnapshot().count).toBe(11);
    expect(() => {
      // @ts-expect-error — 'reset' not in domain option
      dispatch('reset');
    }).toThrow('dispatch: action "reset" is not in the allowed set');
  });

  // ── empty options ──────────────────────────────────────────────────────

  test('{} options: all domain methods accessible, no builtins', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, {});
    dispatch('increment');
    expect(store.getSnapshot().count).toBe(1);
    expect(() => {
      // @ts-expect-error — 'set' is builtin, not in options
      dispatch('set', { count: 99 });
    }).toThrow('dispatch: action "set" is not in the allowed set');
  });

  // ── builtin option defaults domain to all ──────────────────────────────

  test('builtin option with no domain: domain defaults to all', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
    }));
    const dispatch = createStoreDispatch(store, { builtin: ['update'] });
    // domain defaults to all — increment should work
    dispatch('increment');
    dispatch('update', (d: { count: number }) => {
      d.count += 10;
    });
    expect(store.getSnapshot().count).toBe(11);
  });
});
