import { expect, test } from '@playwright/test';
import { createBoundActions, createStore, createStoreDispatch } from '../index';

test.describe('createStoreDispatch', () => {
  // ── Domain method: sync ────────────────────────────────────────────────

  test('dispatch passes through sync return value', () => {
    const store = createStore({ count: 0 }, ({ get }) => ({
      actions: {
        getCount(): number {
          return get().count;
        },
        increment() {
          // no return
        },
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
      actions: {
        async fetchData(value: string): Promise<string> {
          await Promise.resolve();
          update((d) => {
            d.data = value;
          });
          return value;
        },
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
      actions: {
        increment() {
          update((d) => {
            d.value += 1;
          });
        },
      },
    }));

    const outerDispatch = createStoreDispatch(outer);

    // Inner store receives dispatch as context
    type InnerDispatch = typeof outerDispatch;
    const inner = createStore<{ triggered: boolean }, { triggerOuter: () => void }, InnerDispatch>(
      { triggered: false },
      ({ update, getContext }) => ({
        actions: {
          triggerOuter() {
            const dispatch = getContext();
            dispatch('increment');
            update((d) => {
              d.triggered = true;
            });
          },
        },
      })
    );
    inner.setContext(outerDispatch);

    inner.actions.triggerOuter();
    expect(outer.getSnapshot().value).toBe(1);
    expect(inner.getSnapshot().triggered).toBe(true);
  });

  // ── Sequential dispatches ──────────────────────────────────────────────

  test('multiple sequential dispatches accumulate state', () => {
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

    dispatch('increment');
    dispatch('increment');
    dispatch('increment');

    expect(store.getSnapshot().count).toBe(3);
  });

  // ── Invalid action ─────────────────────────────────────────────────────

  test('dispatch throws on unknown action', () => {
    const store = createStore({ count: 0 }, () => ({ actions: {} }));
    const dispatch = createStoreDispatch(store);
    expect(() => {
      // @ts-expect-error — intentionally dispatching unknown action
      dispatch('nonExistent');
    }).toThrow('dispatch: unknown action "nonExistent"');
  });

  // ── domain option ──────────────────────────────────────────────────────

  test('domain option: permitted action dispatches successfully', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
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
      },
    }));
    const dispatch = createStoreDispatch(store, { domain: ['increment'] });
    dispatch('increment');
    expect(store.getSnapshot().count).toBe(1);
  });

  test('domain option: disallowed action throws at runtime', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
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
      },
    }));
    const dispatch = createStoreDispatch(store, { domain: ['increment'] });
    expect(() => {
      // @ts-expect-error — 'reset' not in domain option
      dispatch('reset');
    }).toThrow('dispatch: action "reset" is not in the allowed set');
  });

  test('domain option: restricted dispatch passed as store context', () => {
    const outer = createStore({ value: 0 }, ({ update }) => ({
      actions: {
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
      },
    }));

    // Only 'increment' exposed — inner store cannot call 'decrement'
    const outerDispatch = createStoreDispatch(outer, { domain: ['increment'] });
    type OuterDispatch = typeof outerDispatch;

    const inner = createStore<{ triggered: boolean }, { run: () => void }, OuterDispatch>(
      { triggered: false },
      ({ update, getContext }) => ({
        actions: {
          run() {
            getContext()('increment');
            update((d) => {
              d.triggered = true;
            });
          },
        },
      })
    );
    inner.setContext(outerDispatch);

    inner.actions.run();
    expect(outer.getSnapshot().value).toBe(1);
    expect(inner.getSnapshot().triggered).toBe(true);
  });

  // ── domain: true ───────────────────────────────────────────────────────

  test('domain: true allows all domain methods, no builtins', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
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

  // ── mixed domain arrays ──────────────────────────────────────────────────

  test('domain arrays allow only listed actions', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
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
      },
    }));
    const dispatch = createStoreDispatch(store, {
      domain: ['increment'],
    });
    dispatch('increment');
    expect(store.getSnapshot().count).toBe(1);
    expect(() => {
      // @ts-expect-error — 'reset' not in domain option
      dispatch('reset');
    }).toThrow('dispatch: action "reset" is not in the allowed set');
  });

  // ── empty options ──────────────────────────────────────────────────────

  test('{} options: all domain methods accessible', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    const dispatch = createStoreDispatch(store, {});
    dispatch('increment');
    expect(store.getSnapshot().count).toBe(1);
    expect(() => {
      // @ts-expect-error — 'set' is not a domain action
      dispatch('set', { count: 99 });
    }).toThrow('dispatch: action "set" is not in the allowed set');
  });

  // ── domain option defaults to all -------------------------------

  test('domain option with no explicit list defaults to all domain methods', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    const dispatch = createStoreDispatch(store, { domain: true });
    dispatch('increment');
    expect(store.getSnapshot().count).toBe(1);
  });
});

test.describe('createBoundActions', () => {
  // ── Basic object-shaped access ─────────────────────────────────────────

  test('bound actions call methods via object property access', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    const actions = createBoundActions(store);

    actions.increment();
    expect(store.getSnapshot().count).toBe(1);
  });

  test('nested bound actions call nested methods', () => {
    const store = createStore({ todos: [] as string[] }, ({ update }) => ({
      actions: {
        todos: {
          add(text: string) {
            update((d) => {
              d.todos.push(text);
            });
          },
        },
      },
    }));
    const actions = createBoundActions(store);
    actions.todos.add('Buy milk');
    expect(store.getSnapshot().todos).toEqual(['Buy milk']);
  });

  test('bound actions pass through return values', () => {
    const store = createStore({ count: 5 }, ({ get }) => ({
      actions: {
        getCount(): number {
          return get().count;
        },
      },
    }));
    const actions = createBoundActions(store);
    const result = actions.getCount();
    expect(result).toBe(5);
  });

  test('bound actions pass through async return values', async () => {
    const store = createStore({ data: '' }, ({ update }) => ({
      actions: {
        async fetchData(value: string): Promise<string> {
          await Promise.resolve();
          update((d) => {
            d.data = value;
          });
          return value;
        },
      },
    }));
    const actions = createBoundActions(store);
    const result = await actions.fetchData('hello');
    expect(result).toBe('hello');
    expect(store.getSnapshot().data).toBe('hello');
  });

  // ── domain option ──────────────────────────────────────────────────────

  test('domain option: permitted method callable', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
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
      },
    }));
    const actions = createBoundActions(store, { domain: ['increment'] });
    actions.increment();
    expect(store.getSnapshot().count).toBe(1);
  });

  test('domain option: disallowed method throws at call time', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
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
      },
    }));
    const actions = createBoundActions(store, { domain: ['increment'] });
    expect(() => {
      // @ts-expect-error — 'reset' not in domain
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      actions.reset();
    }).toThrow('boundActions: action "reset" is not in the allowed set');
  });

  test('domain option: disallowed nested method throws at call time', () => {
    const store = createStore({ todos: [] as string[], archive: [] as string[] }, ({ update }) => ({
      actions: {
        todos: {
          add(text: string) {
            update((d) => {
              d.todos.push(text);
            });
          },
        },
        archive: {
          clear() {
            update((d) => {
              d.archive = [];
            });
          },
        },
      },
    }));
    const actions = createBoundActions(store, { domain: ['todos.add'] });
    actions.todos.add('Buy milk');
    expect(store.getSnapshot().todos).toEqual(['Buy milk']);
    expect(() => {
      // @ts-expect-error — 'archive.clear' not in domain
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      actions.archive.clear();
    }).toThrow('boundActions: action "archive.clear" is not in the allowed set');
  });

  test('domain: true allows all methods', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
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
      },
    }));
    const actions = createBoundActions(store, { domain: true });
    actions.increment();
    actions.decrement();
    expect(store.getSnapshot().count).toBe(0);
  });

  test('empty options allow all actions', () => {
    const store = createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    }));
    const actions = createBoundActions(store, {});
    actions.increment();
    expect(store.getSnapshot().count).toBe(1);
  });
});
