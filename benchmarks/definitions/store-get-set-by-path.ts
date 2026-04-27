/**
 * Store — getByPath() / setByPath() — string-path accessors on a live store.
 *
 * These combine parsePath + getAtPath/setAtPath with full store machinery
 * (subscription emit, snapshot replacement). Compare with:
 * - "Path utilities" for raw parsePath/getAtPath/setAtPath without store overhead
 * - "createStore — get / set" for whole-state replacement (no path parsing)
 * - "copyOnWritePath" for structural-sharing writes (no subscription emit)
 *
 * getByPath is read-only — no clone, no emit — so it should be very fast.
 * setByPath clones via copyOnWritePath then emits to subscribers, so it
 * carries the cost of both structural sharing and notification.
 *
 * N = 100,000 for reads, N_SMALL = 10,000 for writes (clone + emit per call).
 *
 * Stability notes (observed CV from latest stable run):
 * - getByPath (all paths): CV ~5–8% — stable; read path has no allocation
 *   and no emission, so GC and JIT variance are minimal.
 * - setByPath (all paths): CV ~19–20% — GC pressure from copyOnWritePath
 *   object allocation per call. Min is roughly half of max across rounds.
 *   Median is reliable; compare medians across runs rather than raw ops/s.
 */

import { createStore } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

// ── Initial values ──────────────────────────────────────────────────────────

type Flat = { count: number; label: string; active: boolean };
type Nested = {
  user: { name: string; address: { city: string; zip: string } };
  scores: number[];
};
type WithArray = {
  phones: Array<{ number: string; label: string; meta: { primary: boolean } }>;
};

const FLAT_INITIAL: Flat = { count: 0, label: 'bench', active: true };
const NESTED_INITIAL: Nested = {
  user: { name: 'Alice', address: { city: 'Montreal', zip: 'H2X' } },
  scores: [10, 20, 30, 40, 50],
};
const ARRAY_INITIAL: WithArray = {
  phones: [
    { number: '5141234567', label: 'home', meta: { primary: true } },
    { number: '5149876543', label: 'work', meta: { primary: false } },
    { number: '4381112222', label: 'mobile', meta: { primary: false } },
  ],
};

const N = 100_000;
const N_SMALL = 10_000;

export function register(bench: Bench): void {
  {
    const store = createStore({ ...FLAT_INITIAL }, () => ({}));
    bench('Store — getByPath / setByPath', 'getByPath("count")', N, () => {
      sink(store.getByPath('count'));
    });
  }

  {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({}));
    bench('Store — getByPath / setByPath', 'getByPath("user.address.city")', N, () => {
      sink(store.getByPath('user.address.city'));
    });
  }

  {
    const store = createStore(structuredClone(ARRAY_INITIAL), () => ({}));
    bench('Store — getByPath / setByPath', 'getByPath("phones[0].label")', N, () => {
      sink(store.getByPath('phones[0].label'));
    });
  }

  {
    const store = createStore({ ...FLAT_INITIAL }, () => ({}));
    bench('Store — getByPath / setByPath', 'setByPath("count", 42)', N_SMALL, () => {
      store.setByPath('count', 42);
    });
  }

  {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({}));
    bench('Store — getByPath / setByPath', 'setByPath("user.address.city")', N_SMALL, () => {
      store.setByPath('user.address.city', 'Vancouver');
    });
  }

  {
    const store = createStore(structuredClone(ARRAY_INITIAL), () => ({}));
    bench('Store — getByPath / setByPath', 'setByPath("phones[0].label")', N_SMALL, () => {
      store.setByPath('phones[0].label', 'work');
    });
  }
}
