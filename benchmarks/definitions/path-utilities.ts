/**
 * Path utilities — low-level path parsing and navigation.
 *
 * These are the building blocks used by getByPath/setByPath:
 * - parsePath: converts "user.address.city" → ["user", "address", "city"]
 *   (cached internally, so repeated calls are near-free)
 * - getAtPath: reads a value by pre-parsed segments
 * - setAtPath: mutates in-place by pre-parsed segments
 *
 * parsePath supports dot notation and bracket syntax: "phones[0].label"
 *
 * N = 100,000 iterations per benchmark.
 */

import { getAtPath, parsePath, setAtPath } from '@stardust/core';
import { sink } from '../runner.ts';
import type { Bench } from './types.ts';

// ── Initial values ──────────────────────────────────────────────────────────

type Nested = {
  user: { name: string; address: { city: string; zip: string } };
  scores: number[];
};
type WithArray = {
  phones: Array<{ number: string; label: string; meta: { primary: boolean } }>;
};

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

export function register(bench: Bench): void {
  bench('Path utilities', 'parsePath("count")', N, () => {
    sink(parsePath('count'));
  });

  bench('Path utilities', 'parsePath("user.address.city")', N, () => {
    sink(parsePath('user.address.city'));
  });

  bench('Path utilities', 'parsePath("phones[0].label")', N, () => {
    sink(parsePath('phones[0].label'));
  });

  {
    const obj = { count: 42 };
    const segs = parsePath('count');
    bench('Path utilities', 'getAtPath top-level', N, () => {
      sink(getAtPath(obj, segs));
    });
  }

  {
    const obj = NESTED_INITIAL;
    const segs = parsePath('user.address.city');
    bench('Path utilities', 'getAtPath 3-deep', N, () => {
      sink(getAtPath(obj, segs));
    });
  }

  {
    const obj = ARRAY_INITIAL;
    const segs = parsePath('phones[1].label');
    bench('Path utilities', 'getAtPath array index', N, () => {
      sink(getAtPath(obj, segs));
    });
  }

  {
    const segs = parsePath('count');
    bench('Path utilities', 'setAtPath top-level', N, () => {
      const obj = { count: 0 };
      setAtPath(obj, segs, 42);
    });
  }

  {
    const segs = parsePath('user.address.city');
    bench('Path utilities', 'setAtPath 3-deep', N, () => {
      const obj = structuredClone(NESTED_INITIAL);
      setAtPath(obj, segs, 'Vancouver');
    });
  }
}
