/**
 * shallowEqual — shallow comparison used as the equals option.
 *
 * Runs inside every store emission when used with createDerivedStore,
 * useStore, or watch. Even small overhead compounds at high emission rates.
 * Three outcomes: equal primitives (Object.is short-circuit), equal objects
 * (full key scan, no notify), different objects (full key scan, notify).
 */

import { shallowEqual } from '@stardust/core';
import { bench, group } from '../mitata.ts';

group('shallowEqual', () => {
  bench('shallowEqual — equal primitives (Object.is)', () => shallowEqual(42, 42));

  bench('shallowEqual — same reference (Object.is)', function* () {
    const a = { count: 1, label: 'bench' };
    yield () => shallowEqual(a, a);
  });

  bench('shallowEqual — equal flat objects (3 keys)', function* () {
    const a = { count: 1, label: 'bench', active: true };
    const b = { count: 1, label: 'bench', active: true };
    yield () => shallowEqual(a, b);
  });

  bench('shallowEqual — different flat objects', function* () {
    const a = { count: 1, label: 'bench', active: true };
    const b = { count: 2, label: 'bench', active: true };
    yield () => shallowEqual(a, b);
  });

  bench('shallowEqual — equal flat objects (10 keys)', function* () {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 10; i++) {
      obj[`k${String(i)}`] = i;
    }
    const a = { ...obj };
    const b = { ...obj };
    yield () => shallowEqual(a, b);
  });
});
