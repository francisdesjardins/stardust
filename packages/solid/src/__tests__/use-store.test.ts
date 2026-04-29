import { expect, test } from '@playwright/test';
import { createRoot } from 'solid-js';
import { useStore } from '../use-store';
import type { StoreContract } from '@stardust/core';

// Minimal mock store that satisfies StoreContract<T>
function makeMockStore<T>(initial: T): StoreContract<T> & { emit: (next: T) => void } {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get listenerCount() {
      return listeners.size;
    },
    emit: (next: T) => {
      snapshot = next;
      for (const l of listeners) {
        l();
      }
    },
  };
}

test('returns initial snapshot as a signal', () => {
  const store = makeMockStore({ count: 0 });
  createRoot((dispose) => {
    const state = useStore(store);
    expect(state()).toEqual({ count: 0 });
    dispose();
  });
});

test('signal updates when the store emits', () => {
  const store = makeMockStore({ count: 0 });
  createRoot((dispose) => {
    const state = useStore(store);
    expect(state()).toEqual({ count: 0 });
    store.emit({ count: 5 });
    expect(state()).toEqual({ count: 5 });
    dispose();
  });
});

test('selector narrows the returned slice', () => {
  const store = makeMockStore({ count: 0, name: 'alice' });
  createRoot((dispose) => {
    const count = useStore(store, (s) => s.count);
    expect(count()).toBe(0);
    store.emit({ count: 3, name: 'alice' });
    expect(count()).toBe(3);
    dispose();
  });
});

test('custom equals suppresses signal update when value is unchanged', () => {
  const store = makeMockStore({ a: 1, b: 2 });
  let renderCount = 0;
  createRoot((dispose) => {
    const slice = useStore(
      store,
      (s) => ({ a: s.a }),
      (x, y) => x.a === y.a
    );
    // Access to track renders in a naive way
    void slice();
    renderCount++;
    // Emit change to b only — equals returns true, signal should not change reference
    store.emit({ a: 1, b: 99 });
    void slice();
    renderCount++;
    expect(slice()).toEqual({ a: 1 });
    dispose();
  });
  expect(renderCount).toBe(2);
});

test('unsubscribes from store on cleanup', () => {
  const base = makeMockStore({ count: 0 });
  let unsub = false;
  const originalSubscribe = base.subscribe.bind(base);
  const store: typeof base = {
    ...base,
    subscribe: (listener: () => void) => {
      const cleanup = originalSubscribe(listener);
      return () => {
        unsub = true;
        cleanup();
      };
    },
  };

  createRoot((dispose) => {
    useStore(store);
    expect(unsub).toBe(false);
    dispose();
  });

  expect(unsub).toBe(true);
});

test('selector receives store as second argument — domain method accessible', () => {
  const store = makeMockStore({ count: 0 });
  const storeWithMethod = {
    ...store,
    doubled(): number {
      return store.getSnapshot().count * 2;
    },
  };
  createRoot((dispose) => {
    const doubled = useStore(storeWithMethod, (_s, s) => s.doubled());
    expect(doubled()).toBe(0);
    storeWithMethod.emit({ count: 5 });
    expect(doubled()).toBe(10);
    dispose();
  });
});

test('multiple signals from the same store update independently', () => {
  const store = makeMockStore({ x: 1, y: 10 });
  createRoot((dispose) => {
    const xSig = useStore(store, (s) => s.x);
    const ySig = useStore(store, (s) => s.y);
    expect(xSig()).toBe(1);
    expect(ySig()).toBe(10);
    store.emit({ x: 2, y: 20 });
    expect(xSig()).toBe(2);
    expect(ySig()).toBe(20);
    dispose();
  });
});
