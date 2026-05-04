import { expect, test } from '@playwright/test';
import type { DiffResult } from '..';
import { connectDebugLog, createStore } from '..';
import { setLogLevel } from '../utils/logger';

// ── Tests ─────────────────────────────────────────────────────────────────────

test('logs "init" with current snapshot immediately when connected', () => {
  const store = createStore({ count: 42 }, () => ({}));
  const calls: Array<{ action: string; diff: DiffResult }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, diff) => calls.push({ action, diff }),
  });
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.action).toBe('init');
  expect(calls[0]?.diff).toMatchObject({ '(root)': { from: undefined, to: { count: 42 } } });
});

test('init fires even when store fires listener immediately on subscribe', () => {
  // Stores that call listeners on subscribe should not double-log init.
  // The proactive init fires at connect time; the subscribe notification is dropped.
  let snapshot = { count: 42 };
  const mockStore = {
    subscribe(l: () => void) {
      l(); // fire immediately
      return () => {};
    },
    getSnapshot() {
      return snapshot;
    },
    listenerCount: 0,
    set(next: { count: number } | ((prev: { count: number }) => { count: number })) {
      snapshot = typeof next === 'function' ? next(snapshot) : next;
    },
    update() {},
    setByPath() {},
    batch(fn: () => void) {
      fn();
    },
    reset() {},
  };

  const calls: Array<{ action: string }> = [];
  const disconnect = connectDebugLog(mockStore, {
    onLog: (action) => calls.push({ action }),
  });
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.action).toBe('init');
});

test('durationMs reflects elapsed time between trackAction and subscription', () => {
  // Custom store: fires the subscription listener only when we call flush(),
  // so we can advance mockNow between the operation and the notification.
  let snapshot = { count: 0 };
  const listeners = new Set<() => void>();
  let pendingFlush: (() => void) | undefined;

  const mockStore = {
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getSnapshot() {
      return snapshot;
    },
    get listenerCount() {
      return listeners.size;
    },
    set(next: { count: number } | ((prev: { count: number }) => { count: number })) {
      snapshot = typeof next === 'function' ? next(snapshot) : next;
      pendingFlush = () => {
        listeners.forEach((l) => {
          l();
        });
      };
    },
    update() {},
    setByPath() {},
    batch(fn: () => void) {
      fn();
    },
    reset() {},
  };

  let mockNow = 0;
  const originalNow = performance.now;
  performance.now = () => mockNow;

  const durations: number[] = [];
  const disconnect = connectDebugLog(mockStore, {
    onLog: (action, _diff, durationMs) => {
      if (action !== 'init') {
        durations.push(durationMs);
      }
    },
  });

  // Operation starts at t=100; advance to t=150 before the subscription fires
  mockNow = 100;
  mockStore.set({ count: 1 }); // trackAction → startTime = 100
  mockNow = 150;
  pendingFlush?.(); // subscription fires → durationMs = 150 - 100 = 50

  disconnect();
  performance.now = originalNow;

  expect(durations).toHaveLength(1);
  expect(durations[0]).toBe(50);
});

test('passes listenerCount through onLog and includes it in built-in logger', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const calls: Array<{ action: string; listenerCount: number }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, _diff, _duration, _actionId, listenerCount) => {
      if (action !== 'init') {
        calls.push({ action, listenerCount });
      }
    },
  });

  store.set({ count: 1 });
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.listenerCount).toBeGreaterThanOrEqual(0);
});

test('built-in logger group header includes live listener count', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const groupArgs: string[] = [];
  const originalGroupCollapsed = console.groupCollapsed;
  const originalGroupEnd = console.groupEnd;

  console.groupCollapsed = (...args: unknown[]) => {
    groupArgs.push(String(args[0]));
  };
  console.groupEnd = () => {};

  setLogLevel('store');
  const disconnect = connectDebugLog(store, {});
  store.set({ count: 1 });
  disconnect();
  setLogLevel(false);

  console.groupCollapsed = originalGroupCollapsed;
  console.groupEnd = originalGroupEnd;

  expect(groupArgs.some((message) => message.includes('listeners:0'))).toBe(true);
});

test('built-in logger group header includes action sub-id', async () => {
  const store = createStore({ status: 'idle', data: '' }, ({ update }) => ({
    async load() {
      update((d) => {
        d.status = 'pending';
      });
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
      update((d) => {
        d.status = 'fulfilled';
      });
    },
  }));

  const groupArgs: string[] = [];
  const originalGroupCollapsed = console.groupCollapsed;
  const originalGroupEnd = console.groupEnd;

  console.groupCollapsed = (...args: unknown[]) => {
    groupArgs.push(String(args[0]));
  };
  console.groupEnd = () => {};

  setLogLevel('store');
  const disconnect = connectDebugLog(store, {});
  await store.load();
  disconnect();
  setLogLevel(false);

  console.groupCollapsed = originalGroupCollapsed;
  console.groupEnd = originalGroupEnd;

  expect(groupArgs.some((message) => message.includes('#0001-00'))).toBe(true);
});

test('does not consume action ids for no-op mutations', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const calls: Array<{ actionId: number; action: string }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, _diff, _duration, actionId) => {
      if (action !== 'init') {
        calls.push({ actionId, action });
      }
    },
  });

  const snapshot = store.getSnapshot();
  store.set(snapshot);
  store.set({ count: 1 });
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.actionId).toBe(1);
  expect(calls[0]?.action).toBe('set');
});

test('built-in logger group body includes snapshot after diff', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const debugArgs: unknown[] = [];
  const originalDebug = console.debug;
  const originalGroupCollapsed = console.groupCollapsed;
  const originalGroupEnd = console.groupEnd;

  console.groupCollapsed = () => {};
  console.groupEnd = () => {};
  console.debug = (...args: unknown[]) => {
    debugArgs.push(args[0]);
  };

  setLogLevel('store');
  const disconnect = connectDebugLog(store, {});
  store.set({ count: 1 });
  disconnect();
  setLogLevel(false);

  console.groupCollapsed = originalGroupCollapsed;
  console.groupEnd = originalGroupEnd;
  console.debug = originalDebug;

  expect(
    debugArgs.some((item) => {
      return (
        item !== null &&
        typeof item === 'object' &&
        'diff' in (item as Record<string, unknown>) &&
        'snapshot' in (item as Record<string, unknown>)
      );
    })
  ).toBe(true);
});

test('logs action name + diff on set', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const calls: Array<{ action: string; diff: DiffResult }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, diff) => {
      if (action !== 'init') {
        calls.push({ action, diff });
      }
    },
  });

  store.set({ count: 5 });
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.action).toBe('set');
  expect(calls[0]?.diff).toMatchObject({ count: { from: 0, to: 5 } });
});

test('logs action name + diff on update', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const calls: Array<{ action: string; diff: DiffResult }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, diff) => {
      if (action !== 'init') {
        calls.push({ action, diff });
      }
    },
  });

  store.update((d) => {
    d.count = 7;
  });
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.action).toBe('update');
  expect(calls[0]?.diff).toMatchObject({ count: { from: 0, to: 7 } });
});

test('logs action name + diff on setByPath', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const calls: Array<{ action: string; diff: DiffResult }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, diff) => {
      if (action !== 'init') {
        calls.push({ action, diff });
      }
    },
  });

  store.setByPath('count', 3);
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.action).toBe('setByPath(count)');
  expect(calls[0]?.diff).toMatchObject({ count: { from: 0, to: 3 } });
});

test('logs action name + diff on domain method', () => {
  const store = createStore({ count: 0 }, ({ update }) => ({
    increment() {
      update((d) => {
        d.count += 1;
      });
    },
  }));
  const calls: Array<{ action: string; diff: DiffResult }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, diff) => {
      if (action !== 'init') {
        calls.push({ action, diff });
      }
    },
  });

  store.increment();
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.action).toBe('increment');
  expect(calls[0]?.diff).toMatchObject({ count: { from: 0, to: 1 } });
});

test('async domain method: all subscription fires attributed to the method name', async () => {
  let resolveLoad!: (data: string) => void;
  const store = createStore({ status: 'idle', data: '' }, ({ update }) => ({
    async load() {
      update((d) => {
        d.status = 'pending';
      });
      const data = await new Promise<string>((res) => {
        resolveLoad = res;
      });
      update((d) => {
        d.status = 'fulfilled';
        d.data = data;
      });
    },
  }));
  const calls: Array<{ action: string }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action) => {
      if (action !== 'init') {
        calls.push({ action });
      }
    },
  });

  const p = store.load();
  resolveLoad('ok');
  await p;
  disconnect();

  expect(calls.every((c) => c.action === 'load')).toBe(true);
  expect(calls).toHaveLength(2);
});

test('logs nested method name for array methods', () => {
  const store = createStore({ phones: [] as string[] }, ({ update }) => ({
    phones: {
      add(phone: string) {
        update((d) => {
          d.phones.push(phone);
        });
      },
    },
  }));
  const calls: Array<{ action: string }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action) => {
      if (action !== 'init') {
        calls.push({ action });
      }
    },
  });

  store.phones.add('514-555-0100');
  disconnect();

  expect(calls[0]?.action).toBe('phones.add');
});

test('batch logs accumulated action names', () => {
  const store = createStore({ x: 0, y: 0 }, () => ({}));
  const calls: Array<{ action: string }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action) => {
      if (action !== 'init') {
        calls.push({ action });
      }
    },
  });

  store.batch(() => {
    store.set({ x: 1, y: 2 });
    store.reset();
  });
  disconnect();

  expect(calls).toHaveLength(1);
  expect(calls[0]?.action).toContain('batch');
  expect(calls[0]?.action).toContain('set');
  expect(calls[0]?.action).toContain('reset');
});

test('no mutation logs after disconnect', () => {
  const store = createStore({ count: 0 }, () => ({}));
  const mutations: unknown[] = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action) => {
      if (action !== 'init') {
        mutations.push(action);
      }
    },
  });

  disconnect();
  store.set({ count: 99 });

  expect(mutations).toHaveLength(0);
});

test('silent when namespace is inactive', () => {
  const store = createStore({ count: 0 }, () => ({}));
  setLogLevel(false);
  const calls: unknown[] = [];
  const original = console.debug;
  console.debug = (...args: unknown[]) => calls.push(args);

  const disconnect = connectDebugLog(store, { name: 'silent-store' });
  store.set({ count: 1 });
  disconnect();

  console.debug = original;

  expect(calls).toHaveLength(0);
});

test('diff uses dotted paths for nested object field changes', () => {
  const store = createStore({ user: { name: 'Alice' } }, () => ({}));
  const calls: Array<{ diff: DiffResult }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action, diff) => {
      if (action !== 'init') {
        calls.push({ diff });
      }
    },
  });

  store.set({ user: { name: 'Bob' } });
  disconnect();

  expect(calls[0]?.diff).toMatchObject({ 'user.name': { from: 'Alice', to: 'Bob' } });
});

test('diff labels root-level change as "(root)" when prev is non-object', () => {
  // A mock store whose getSnapshot() initially returns a non-object triggers
  // the path='' branch in computeDiff, producing the '(root)' key.
  let snapshot: unknown = null;
  const listeners = new Set<() => void>();
  const mockStore = {
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    getSnapshot() {
      return snapshot as { count: number };
    },
    get listenerCount() {
      return listeners.size;
    },
    set(next: { count: number } | ((prev: { count: number }) => { count: number })) {
      snapshot = typeof next === 'function' ? next(snapshot as { count: number }) : next;
      listeners.forEach((l) => {
        l();
      });
    },
    update() {},
    setByPath() {},
    batch(fn: () => void) {
      fn();
    },
    reset() {},
  };

  const calls: Array<{ diff: DiffResult }> = [];
  const disconnect = connectDebugLog(mockStore, {
    onLog: (action, diff) => {
      if (action !== 'init') {
        calls.push({ diff });
      }
    },
  });

  mockStore.set({ count: 1 });
  disconnect();

  expect(calls[0]?.diff['(root)']).toEqual({ from: null, to: { count: 1 } });
});

test('uses bare "store" logger namespace when no name is given', () => {
  const store = createStore({ count: 0 }, () => ({}));
  setLogLevel('store');
  const groupArgs: unknown[][] = [];
  const originalGroupCollapsed = console.groupCollapsed;
  const originalGroupEnd = console.groupEnd;
  const originalDebug = console.debug;
  console.groupCollapsed = (...args: unknown[]) => groupArgs.push(args);
  console.groupEnd = () => {};
  console.debug = () => {};

  const disconnect = connectDebugLog(store, {}); // no onLog, no name
  store.set({ count: 1 });
  disconnect();

  console.groupCollapsed = originalGroupCollapsed;
  console.groupEnd = originalGroupEnd;
  console.debug = originalDebug;
  setLogLevel(false);

  expect(groupArgs.length).toBeGreaterThan(0);
  expect(String(groupArgs[0])).toContain('stardust:store');
});

test('wraps 3-level nested domain objects with full prefix path', () => {
  const store = createStore({ val: 0 }, ({ update }) => ({
    a: {
      b: {
        inc() {
          update((d) => {
            d.val += 1;
          });
        },
      },
    },
  }));
  const calls: Array<{ action: string }> = [];
  const disconnect = connectDebugLog(store, {
    onLog: (action) => {
      if (action !== 'init') {
        calls.push({ action });
      }
    },
  });

  store.a.b.inc();
  disconnect();

  expect(calls[0]?.action).toBe('a.b.inc');
});
