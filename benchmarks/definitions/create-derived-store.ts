/**
 * createDerivedStore — read-only stores that recompute from source stores.
 *
 * Benchmarks measure:
 * - Recompute cost (single and multi-source): source emit → derive() → equals check
 * - Equality skip: source changes but derived value is structurally the same
 *   (shallowEqual returns true → listeners not called)
 * - Fan-out: derived listener count independent of source listener count —
 *   a single source subscription fans out to N derived listeners, which is
 *   a different topology than raw createStoreSubscription fan-out
 * - Subscribe/unsubscribe: lazy lifecycle — sources are only subscribed to
 *   while the derived store has at least one listener
 *
 * N = 100,000 for fast ops, N_SMALL = 10,000 for high-listener scenarios.
 *
 * Stability notes (observed CV from latest stable run):
 * - subscribe + unsubscribe: CV ~71% — inherits the same GC-pressure
 *   instability as the createStoreSubscription variant. Single-run results
 *   are not reliable; consult `bench:stable` median-of-medians.
 * - fan-out: 10 listeners: CV ~40% — shares the JIT inflection-point
 *   instability with createStoreSubscription fan-out: 10. Results vary
 *   widely between rounds.
 * - fan-out: 1 listener (primitive): CV ~23% — bimodal JIT at ~21M ops/s.
 * - shallowEqual skip, multi-source recompute: CV ~16–18% — GC pauses
 *   from temporary object allocation; median is reliable.
 * - single-source recompute, fan-out: 100/1000: CV ~10–18% — acceptable;
 *   median tracks well across runs.
 */

import { createDerivedStore } from '@stardust/core';
import { createStore } from '@stardust/core';
import { shallowEqual } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

const N = 100_000;
const N_SMALL = 10_000;

export function register(bench: Bench): void {
  // ── Single-source recompute ───────────────────────────────────────────────

  {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      tick() {
        set({ count: get().count + 1 });
      },
    }));
    const derived = createDerivedStore([counter], (c) => ({ doubled: c.count * 2 }), {
      equals: shallowEqual,
    });
    // Activate lazy subscription
    derived.subscribe(() => {});
    bench('createDerivedStore', 'single-source recompute (object)', N, () => {
      counter.tick();
      sink(derived.getSnapshot());
    });
  }

  // ── Multi-source recompute (3 sources) ────────────────────────────────────

  {
    const a = createStore({ v: 0 }, ({ set, get }) => ({
      tick() {
        set({ v: get().v + 1 });
      },
    }));
    const b = createStore({ v: 0 }, ({ set, get }) => ({
      tick() {
        set({ v: get().v + 1 });
      },
    }));
    const c = createStore({ v: 0 }, ({ set, get }) => ({
      tick() {
        set({ v: get().v + 1 });
      },
    }));
    const derived = createDerivedStore(
      [a, b, c],
      (sa, sb, sc) => ({
        sum: sa.v + sb.v + sc.v,
      }),
      { equals: shallowEqual }
    );
    derived.subscribe(() => {});
    let i = 0;
    bench('createDerivedStore', 'multi-source (3) recompute', N, () => {
      // Rotate which source changes
      const stores = [a, b, c];
      stores[i % 3].tick();
      sink(derived.getSnapshot());
      i++;
    });
  }

  // ── shallowEqual skip (no notification) ───────────────────────────────────

  {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      tick() {
        set({ count: get().count + 1 });
      },
    }));
    const label = createStore({ label: 'x' }, ({ set, get }) => ({
      toggle() {
        set({ label: get().label === 'x' ? 'y' : 'x' });
      },
    }));
    // Derived only uses counter — label changes should be suppressed by shallowEqual
    const derived = createDerivedStore(
      [counter, label],
      (c, _l) => ({
        doubled: c.count * 2,
      }),
      { equals: shallowEqual }
    );
    let notifyCount = 0;
    derived.subscribe(() => {
      notifyCount++;
    });
    bench('createDerivedStore', 'shallowEqual skip (no notify)', N, () => {
      label.toggle(); // triggers recompute but result unchanged → skip
      sink(notifyCount);
    });
  }

  // ── Fan-out ───────────────────────────────────────────────────────────────

  {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      tick() {
        set({ count: get().count + 1 });
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    derived.subscribe(() => {});
    bench('createDerivedStore', 'fan-out: 1 listener (primitive)', N, () => {
      counter.tick();
      sink(derived.getSnapshot());
    });
  }

  {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      tick() {
        set({ count: get().count + 1 });
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    for (let i = 0; i < 10; i++) {
      derived.subscribe(() => {});
    }
    bench('createDerivedStore', 'fan-out: 10 listeners', N, () => {
      counter.tick();
      sink(derived.getSnapshot());
    });
  }

  {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      tick() {
        set({ count: get().count + 1 });
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    for (let i = 0; i < 100; i++) {
      derived.subscribe(() => {});
    }
    bench('createDerivedStore', 'fan-out: 100 listeners', N, () => {
      counter.tick();
      sink(derived.getSnapshot());
    });
  }

  {
    const counter = createStore({ count: 0 }, ({ set, get }) => ({
      tick() {
        set({ count: get().count + 1 });
      },
    }));
    const derived = createDerivedStore([counter], (c) => c.count * 2);
    for (let i = 0; i < 1_000; i++) {
      derived.subscribe(() => {});
    }
    bench('createDerivedStore', 'fan-out: 1000 listeners', N_SMALL, () => {
      counter.tick();
      sink(derived.getSnapshot());
    });
  }

  // ── Subscribe / unsubscribe lifecycle ─────────────────────────────────────

  {
    const counter = createStore({ count: 0 }, () => ({}));
    const derived = createDerivedStore([counter], (c) => c.count);
    bench('createDerivedStore', 'subscribe + unsubscribe', N, () => {
      const unsub = derived.subscribe(() => {});
      unsub();
    });
  }
}
