/**
 * watch — non-React store observer.
 *
 * watch(store, selector?, callback, options?) subscribes to a store outside
 * React and fires callback(next, prev) only when the observed value changes.
 * Zero React imports — the non-React companion to useStore.
 *
 * Each emission goes through:
 *   selector(snapshot) → equality check → callback (if changed)
 *
 * Benchmarks cover:
 * - Full-snapshot watch (no selector) — callback fires on every emission
 * - Selector watch: primitive field — fires only when the field changes
 * - Selector watch + shallowEqual — suppresses when the derived object is
 *   structurally identical even though it's a new reference
 * - subscribe + unsubscribe lifecycle — allocation cost per watch call
 * - Suppressed callback (value unchanged) — cost when equality returns true
 *
 * N = 100,000 iterations per benchmark.
 */

import { createStore } from '@stardust/core';
import { shallowEqual } from '@stardust/core';
import { watch } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

// ── Initial values ──────────────────────────────────────────────────────────

type Flat = { count: number; label: string; active: boolean };
const FLAT_INITIAL: Flat = { count: 0, label: 'bench', active: true };

const N = 100_000;

export function register(bench: Bench): void {
  // ── Full-snapshot watch (no selector) ──────────────────────────────────────
  // callback fires on every emission; baseline cost is selector + Object.is check.
  {
    const store = createStore({ ...FLAT_INITIAL }, ({ set, get }) => ({
      tick() {
        set({ ...get(), count: get().count + 1 });
      },
    }));
    let calls = 0;
    watch(store, () => {
      calls++;
    });
    bench('watch', 'watch full snapshot (no selector)', N, () => {
      store.tick();
      sink(calls);
    });
  }

  // ── Primitive selector — fires only on field change ────────────────────────
  // Isolates the per-emission cost: selector(snap) + Object.is comparison.
  {
    const store = createStore({ ...FLAT_INITIAL }, ({ set, get }) => ({
      tick() {
        set({ ...get(), count: get().count + 1 });
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
    bench('watch', 'watch selector — primitive field', N, () => {
      store.tick();
      sink(calls);
    });
  }

  // ── Object selector + shallowEqual — suppress new-reference noise ──────────
  // The selector returns a new object literal every call; shallowEqual prevents
  // spurious callbacks when the shape hasn't changed.
  {
    const store = createStore({ ...FLAT_INITIAL }, ({ set, get }) => ({
      tick() {
        set({ ...get(), count: get().count + 1 });
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
    bench('watch', 'watch selector + shallowEqual', N, () => {
      store.tick();
      sink(calls);
    });
  }

  // ── Subscribe + unsubscribe lifecycle ─────────────────────────────────────
  // Allocation cost of setting up and tearing down a watch.
  {
    const store = createStore({ count: 0 }, () => ({}));
    bench('watch', 'watch subscribe + unsubscribe', N, () => {
      const unsub = watch(
        store,
        (s) => s.count,
        () => {}
      );
      unsub();
    });
  }

  // ── Suppressed callback (value unchanged) ──────────────────────────────────
  // The store emits a new snapshot but the selected value is unchanged.
  // Measures the short-circuit cost: selector + Object.is returning true.
  {
    const store = createStore({ count: 0, label: 'x' }, ({ set, get }) => ({
      toggleLabel() {
        // Only `label` changes — `count` stays at 0
        set({ ...get(), label: get().label === 'x' ? 'y' : 'x' });
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
    bench('watch', 'watch callback suppressed (no change)', N, () => {
      store.toggleLabel();
      sink(calls); // should remain 0
    });
  }
}
