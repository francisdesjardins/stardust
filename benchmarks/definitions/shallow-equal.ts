/**
 * shallowEqual — shallow comparison used as the `equals` option.
 *
 * shallowEqual is exported for use with createDerivedStore, useStore, and
 * watch whenever selectors return new object literals on every call. It
 * prevents spurious notifications when the shape is unchanged.
 *
 * Implementation: Object.is for primitives; own-key Object.is per value
 * for objects/arrays. Falls back to false on type mismatch.
 *
 * Benchmarks cover the three outcomes:
 * - Equal primitives  — short-circuits via Object.is (fastest path)
 * - Equal objects     — full own-key scan, all values match (no notify)
 * - Different objects — full own-key scan, one value differs (notify)
 *
 * N = 1,000,000 iterations — shallowEqual runs inside every store emission
 * when used as an `equals` option, so even small overhead compounds.
 *
 * Stability notes (observed CV from latest stable run):
 * - equal primitives (Object.is), same reference: CV ~20% — bimodal JIT.
 *   Both resolve via a single Object.is() call at ~290M ops/s; V8 may
 *   speculatively deoptimise between rounds. Min is roughly half of max.
 *   The median is stable; a high stddev here is expected JIT noise.
 * - different flat objects, equal flat objects (10 keys): CV ~19% — fast
 *   enough to trigger the same bimodal pattern; treat the same way.
 * - equal flat objects (3 keys): CV ~10% — more stable because the 3-key
 *   scan is slow enough that V8 settles on a single compilation tier.
 */

import { shallowEqual } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

const N = 1_000_000;

export function register(bench: Bench): void {
  // ── Primitive short-circuit ────────────────────────────────────────────────
  {
    bench('shallowEqual', 'shallowEqual — equal primitives (Object.is)', N, () => {
      sink(shallowEqual(42, 42));
    });
  }

  // ── Equal flat objects (3 keys) ────────────────────────────────────────────
  {
    const a = { count: 1, label: 'bench', active: true };
    const b = { count: 1, label: 'bench', active: true };
    bench('shallowEqual', 'shallowEqual — equal flat objects (3 keys)', N, () => {
      sink(shallowEqual(a, b));
    });
  }

  // ── Different flat objects (1 key differs) ─────────────────────────────────
  {
    const a = { count: 1, label: 'bench', active: true };
    const b = { count: 2, label: 'bench', active: true };
    bench('shallowEqual', 'shallowEqual — different flat objects', N, () => {
      sink(shallowEqual(a, b));
    });
  }

  // ── Equal wider objects (10 keys) ──────────────────────────────────────────
  {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 10; i++) {
      obj[`k${String(i)}`] = i;
    }
    const a = { ...obj };
    const b = { ...obj };
    bench('shallowEqual', 'shallowEqual — equal flat objects (10 keys)', N, () => {
      sink(shallowEqual(a, b));
    });
  }

  // ── Same reference ─────────────────────────────────────────────────────────
  // Object.is fast path — no key scan needed.
  {
    const a = { count: 1, label: 'bench' };
    bench('shallowEqual', 'shallowEqual — same reference (Object.is)', N, () => {
      sink(shallowEqual(a, a));
    });
  }
}
