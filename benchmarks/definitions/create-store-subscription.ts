/**
 * createStoreSubscription — low-level pub/sub primitive that powers store
 * reactivity. Measures raw notification path, subscribe/unsubscribe
 * allocation cost, and fan-out scaling (1 → 1000 listeners).
 */

import { createStoreSubscription } from '@stardust/core';
import { bench, group } from '../mitata.ts';

type Flat = { count: number; label: string; active: boolean };
const FLAT_INITIAL: Flat = { count: 0, label: 'bench', active: true };

group('createStoreSubscription', () => {
  bench('emit + getSnapshot (flat)', function* () {
    const sub = createStoreSubscription<Flat>({ ...FLAT_INITIAL });
    yield () => {
      sub.emit({ count: 1, label: 'x', active: false });
      return sub.getSnapshot();
    };
  });

  bench('subscribe + unsubscribe', function* () {
    const sub = createStoreSubscription(0);
    yield () => {
      const unsub = sub.subscribe(() => {});
      unsub();
    };
  });

  bench('fan-out: 1 listener', function* () {
    const sub = createStoreSubscription(0);
    sub.subscribe(() => {});
    let v = 0;
    yield () => sub.emit(v++);
  });

  bench('fan-out: 10 listeners', function* () {
    const sub = createStoreSubscription(0);
    for (let i = 0; i < 10; i++) sub.subscribe(() => {});
    let v = 0;
    yield () => sub.emit(v++);
  });

  bench('fan-out: 100 listeners', function* () {
    const sub = createStoreSubscription(0);
    for (let i = 0; i < 100; i++) sub.subscribe(() => {});
    let v = 0;
    yield () => sub.emit(v++);
  });

  bench('fan-out: 1000 listeners', function* () {
    const sub = createStoreSubscription(0);
    for (let i = 0; i < 1_000; i++) sub.subscribe(() => {});
    let v = 0;
    yield () => sub.emit(v++);
  });
});
