/**
 * createStoreSubscription — the low-level pub/sub primitive that powers
 * store reactivity. Every createStore uses one internally.
 *
 * These benchmarks measure the raw notification path:
 * - emit + getSnapshot: how fast state changes propagate
 * - subscribe/unsubscribe: allocation cost of adding/removing listeners
 * - fan-out: how notification scales with listener count (1 → 1000)
 *
 * N = 100,000 iterations for fast ops, N_SMALL = 10,000 for slower ones
 * (e.g. 1000 listeners) to keep total runtime reasonable.
 *
 * Stability notes (observed CV from latest stable run):
 * - subscribe + unsubscribe: CV ~71% — extremely unstable. Allocation +
 *   deallocation in a tight loop triggers GC pauses unpredictably. Treat
 *   any single-run result as directional only; use `bench:stable` (10 runs)
 *   and look at the median-of-medians, not the raw ops/s.
 * - fan-out: 10 listeners: CV ~40% — V8 JIT inflection point. The loop
 *   over 10 callbacks sits at the boundary where V8 may or may not apply
 *   loop-unrolling or inline-cache optimisations between runs.
 * - emit + getSnapshot (flat): CV ~20% — see bimodal JIT note below.
 * - fan-out: 100 / 1000 listeners: CV ~10–18% — GC pauses from the large
 *   listener arrays, but median is reliable at this iteration count.
 * - fan-out: 1 listener: CV < 1% — the most stable benchmark in this group.
 *
 * Bimodal JIT: benchmarks running >50M ops/s on V8 often exhibit a ~2×
 * spread between min and max. V8 can speculatively deoptimise a hot function
 * when surrounding code changes; the median absorbs this, but stddev looks
 * alarming. A large stddev on a very fast benchmark is expected noise, not a
 * regression — confirm with `bench:stable` before acting on it.
 */

import { createStoreSubscription } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

// ── Initial values ──────────────────────────────────────────────────────────

type Flat = { count: number; label: string; active: boolean };
const FLAT_INITIAL: Flat = { count: 0, label: 'bench', active: true };

const N = 100_000;
const N_SMALL = 10_000;

export function register(bench: Bench): void {
  {
    const sub = createStoreSubscription<Flat>({ ...FLAT_INITIAL });
    bench('createStoreSubscription', 'emit + getSnapshot (flat)', N, () => {
      sub.emit({ count: 1, label: 'x', active: false });
      sink(sub.getSnapshot());
    });
  }

  {
    const sub = createStoreSubscription(0);
    bench('createStoreSubscription', 'subscribe + unsubscribe', N, () => {
      const unsub = sub.subscribe(() => {});
      unsub();
    });
  }

  {
    const sub = createStoreSubscription(0);
    sub.subscribe(() => {});
    let v = 0;
    bench('createStoreSubscription', 'fan-out: 1 listener', N, () => {
      sub.emit(v++);
    });
  }

  {
    const sub = createStoreSubscription(0);
    for (let i = 0; i < 10; i++) {
      sub.subscribe(() => {});
    }
    let v = 0;
    bench('createStoreSubscription', 'fan-out: 10 listeners', N, () => {
      sub.emit(v++);
    });
  }

  {
    const sub = createStoreSubscription(0);
    for (let i = 0; i < 100; i++) {
      sub.subscribe(() => {});
    }
    let v = 0;
    bench('createStoreSubscription', 'fan-out: 100 listeners', N, () => {
      sub.emit(v++);
    });
  }

  {
    const sub = createStoreSubscription(0);
    for (let i = 0; i < 1_000; i++) {
      sub.subscribe(() => {});
    }
    let v = 0;
    bench('createStoreSubscription', 'fan-out: 1000 listeners', N_SMALL, () => {
      sub.emit(v++);
    });
  }
}
