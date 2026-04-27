/**
 * copyOnWritePath — structural sharing, only clones nodes along the
 * mutated path. The engine behind setByPath — minimal allocations vs
 * structuredClone which copies everything.
 */

import { copyOnWritePath, parsePath } from '@stardust/core';
import { bench, group } from '../mitata.ts';

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

group('copyOnWritePath', () => {
  bench('copyOnWritePath flat top-level', function* () {
    const obj = { count: 0, label: 'bench', active: true };
    const segs = parsePath('count');
    yield () => copyOnWritePath(obj, segs, 42);
  });

  bench('copyOnWritePath nested 3-deep', function* () {
    const obj = structuredClone(NESTED_INITIAL);
    const segs = parsePath('user.address.city');
    yield () => copyOnWritePath(obj, segs, 'Vancouver');
  });

  bench('copyOnWritePath array index', function* () {
    const obj = structuredClone(ARRAY_INITIAL);
    const segs = parsePath('phones[0].label');
    yield () => copyOnWritePath(obj, segs, 'work');
  });

  bench('copyOnWritePath 50-item arr[0].value', function* () {
    const obj = {
      items: Array.from({ length: 50 }, (_, i) => ({ id: i, value: `v${String(i)}` })),
    };
    const segs = parsePath('items[0].value');
    yield () => copyOnWritePath(obj, segs, 'changed');
  });
});
