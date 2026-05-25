/**
 * batch — coalesces multiple setByPath calls into a single notification.
 *
 * Without batching, each setByPath triggers its own copyOnWritePath +
 * emit cycle. batch() defers the emit until the callback completes, so
 * 10 setByPath calls produce 1 subscriber notification instead of 10.
 */

import { createStore } from '@stardust/core';
import { bench, group } from '../mitata.ts';

type Flat = { count: number; label: string; active: boolean };
const FLAT_INITIAL: Flat = { count: 0, label: 'bench', active: true };

group('batch', () => {
  bench('batch 10× setByPath flat', function* () {
    const store = createStore({ ...FLAT_INITIAL, a: 0, b: 0, c: 0 });
    yield () => {
      store.batch(() => {
        for (let i = 0; i < 10; i++) {
          store.setByPath('count', i);
        }
      });
    };
  });

  bench('10× setByPath unbatched + 1 listener', function* () {
    const store = createStore({ ...FLAT_INITIAL });
    store.subscribe(() => {});
    yield () => {
      for (let i = 0; i < 10; i++) {
        store.setByPath('count', i);
      }
    };
  });

  bench('batch 10× setByPath + 1 listener', function* () {
    const store = createStore({ ...FLAT_INITIAL });
    store.subscribe(() => {});
    yield () => {
      store.batch(() => {
        for (let i = 0; i < 10; i++) {
          store.setByPath('count', i);
        }
      });
    };
  });

  bench('batch 10× setByPath + 10 listeners', function* () {
    const store = createStore({ ...FLAT_INITIAL });
    for (let i = 0; i < 10; i++) {
      store.subscribe(() => {});
    }
    yield () => {
      store.batch(() => {
        for (let i = 0; i < 10; i++) {
          store.setByPath('count', i);
        }
      });
    };
  });
});
