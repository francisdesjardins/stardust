/**
 * useSuspenseStore unit tests — Node/SSR scope.
 *
 * createResource (used internally by useSuspenseStore) requires a browser
 * Suspense context and cannot run in the Node SSR bundle. These tests
 * therefore verify the async state shapes and the underlying useStore
 * subscription wiring that useSuspenseStore delegates to, without mounting
 * the full hook. Full integration tests belong in a browser CT setup.
 */
import { expect, test } from '@playwright/test';
import { createRoot } from 'solid-js';
import {
  asyncFulfilled,
  asyncIdle,
  asyncPending,
  asyncRejected,
  type AsyncState,
} from '@stardust/core';
import { useStore } from '../use-store';
import type { StoreContract } from '@stardust/core';

type AsyncStore<T> = StoreContract<{ data: AsyncState<T> }> & {
  emit: (next: AsyncState<T>) => void;
};

function makeMockAsyncStore<T>(initial: AsyncState<T>): AsyncStore<T> {
  let snapshot = { data: initial };
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
    emit: (next: AsyncState<T>) => {
      snapshot = { data: next };
      for (const l of listeners) {
        l();
      }
    },
  };
}

// ── AsyncState helpers ───────────────────────────────────────────────────────

test('asyncIdle has status "idle"', () => {
  expect(asyncIdle.status).toBe('idle');
});

test('asyncPending has status "pending"', () => {
  expect(asyncPending.status).toBe('pending');
});

test('asyncFulfilled wraps data with status "fulfilled"', () => {
  const s = asyncFulfilled({ name: 'Alice' });
  expect(s.status).toBe('fulfilled');
  expect(s.data).toEqual({ name: 'Alice' });
});

test('asyncRejected wraps an Error with status "rejected"', () => {
  const err = new Error('oops');
  const s = asyncRejected(err);
  expect(s.status).toBe('rejected');
  expect(s.error).toBe(err);
});

// ── useStore wiring for AsyncState slices ────────────────────────────────────
// useSuspenseStore delegates subscription tracking to useStore. These tests
// verify the signal layer that sits beneath createResource.

test('useStore tracks an AsyncState slice reactively', () => {
  const store = makeMockAsyncStore<{ name: string }>(asyncIdle);
  createRoot((dispose) => {
    const state = useStore(store, (s) => s.data);
    expect(state().status).toBe('idle');

    store.emit(asyncPending);
    expect(state().status).toBe('pending');

    store.emit(asyncFulfilled({ name: 'Alice' }));
    expect(state().status).toBe('fulfilled');
    if (state().status === 'fulfilled') {
      expect((state() as ReturnType<typeof asyncFulfilled<{ name: string }>>).data.name).toBe(
        'Alice'
      );
    }

    dispose();
  });
});

test('useStore tracks rejected AsyncState', () => {
  const err = new Error('network error');
  const store = makeMockAsyncStore<{ name: string }>(asyncIdle);
  createRoot((dispose) => {
    const state = useStore(store, (s) => s.data);
    store.emit(asyncRejected(err));
    expect(state().status).toBe('rejected');
    const s = state();
    if (s.status === 'rejected') {
      expect(s.error).toBe(err);
    }
    dispose();
  });
});
