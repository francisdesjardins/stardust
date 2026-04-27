/**
 * Path utilities — low-level path parsing and navigation.
 *
 * parsePath is cached internally so repeated calls are near-free.
 * getAtPath reads by pre-parsed segments; setAtPath mutates in-place.
 */

import { getAtPath, parsePath, setAtPath } from '@stardust/core';
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

group('Path utilities', () => {
  bench('parsePath("count")', () => parsePath('count'));
  bench('parsePath("user.address.city")', () => parsePath('user.address.city'));
  bench('parsePath("phones[0].label")', () => parsePath('phones[0].label'));

  bench('getAtPath top-level', function* () {
    const obj = { count: 42 };
    const segs = parsePath('count');
    yield () => getAtPath(obj, segs);
  });

  bench('getAtPath 3-deep', function* () {
    const obj = NESTED_INITIAL;
    const segs = parsePath('user.address.city');
    yield () => getAtPath(obj, segs);
  });

  bench('getAtPath array index', function* () {
    const obj = ARRAY_INITIAL;
    const segs = parsePath('phones[1].label');
    yield () => getAtPath(obj, segs);
  });

  bench('setAtPath top-level', function* () {
    const segs = parsePath('count');
    yield () => {
      const obj = { count: 0 };
      setAtPath(obj, segs, 42);
    };
  });

  bench('setAtPath 3-deep', function* () {
    const segs = parsePath('user.address.city');
    yield () => {
      const obj = structuredClone(NESTED_INITIAL);
      setAtPath(obj, segs, 'Vancouver');
    };
  });
});
