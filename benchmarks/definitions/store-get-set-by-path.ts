/**
 * Store — getByPath() / setByPath() — string-path accessors on a live store.
 *
 * Combines parsePath + getAtPath/setAtPath with full store machinery.
 * Compare with "Path utilities" (no store overhead) and "copyOnWritePath"
 * (no subscription emit).
 */

import { createStore } from '@stardust/core';
import { bench, group } from '../mitata.ts';

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

group('Store — getByPath / setByPath', () => {
  bench('getByPath("count")', function* () {
    const store = createStore({ ...FLAT_INITIAL }, () => ({ actions: {} }));
    yield () => store.getByPath('count');
  });

  bench('getByPath("user.address.city")', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({ actions: {} }));
    yield () => store.getByPath('user.address.city');
  });

  bench('getByPath("phones[0].label")', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), () => ({ actions: {} }));
    yield () => store.getByPath('phones[0].label');
  });

  bench('setByPath("count", 42)', function* () {
    const store = createStore({ ...FLAT_INITIAL }, () => ({ actions: {} }));
    yield () => store.setByPath('count', 42);
  });

  bench('setByPath("user.address.city")', function* () {
    const store = createStore(structuredClone(NESTED_INITIAL), () => ({ actions: {} }));
    yield () => store.setByPath('user.address.city', 'Vancouver');
  });

  bench('setByPath("phones[0].label")', function* () {
    const store = createStore(structuredClone(ARRAY_INITIAL), () => ({ actions: {} }));
    yield () => store.setByPath('phones[0].label', 'work');
  });
});
