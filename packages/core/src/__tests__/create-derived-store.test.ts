import { expect, test } from '@playwright/test';
import { createDerivedStore, createStore, shallowEqual } from '..';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCounter(initial = 0) {
  return createStore({ count: initial }, ({ update }) => ({
    actions: {
      increment() {
        update((d) => {
          d.count += 1;
        });
      },
      set(n: number) {
        update((d) => {
          d.count = n;
        });
      },
    },
  }));
}

function makeLabel(initial = '') {
  return createStore({ label: initial }, ({ update }) => ({
    actions: {
      setLabel(v: string) {
        update((d) => {
          d.label = v;
        });
      },
    },
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('createDerivedStore', () => {
  test.describe('initial value', () => {
    test('computes initial snapshot from sources', () => {
      const counter = makeCounter(5);
      const derived = createDerivedStore([counter], (c) => c.count * 2);
      expect(derived.getSnapshot()).toBe(10);
    });

    test('computes from multiple sources', () => {
      const counter = makeCounter(3);
      const label = makeLabel('hi');
      const derived = createDerivedStore(
        [counter, label],
        (c, l) => `${l.label}:${String(c.count)}`
      );
      expect(derived.getSnapshot()).toBe('hi:3');
    });
  });

  test.describe('reactivity', () => {
    test('recomputes when a source changes', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count * 2);

      // Subscribe to activate lazy subscription
      const unsub = derived.subscribe(() => {
        /* noop */
      });

      counter.actions.increment();
      expect(derived.getSnapshot()).toBe(2);

      counter.actions.increment();
      expect(derived.getSnapshot()).toBe(4);

      unsub();
    });

    test('notifies listeners on change', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count * 2);

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      counter.actions.increment();
      expect(callCount).toBe(1);

      counter.actions.increment();
      expect(callCount).toBe(2);

      unsub();
    });

    test('reacts to any source in a multi-source derive', () => {
      const counter = makeCounter(0);
      const label = makeLabel('a');
      const derived = createDerivedStore(
        [counter, label],
        (c, l) => `${l.label}:${String(c.count)}`
      );

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      counter.actions.increment();
      expect(derived.getSnapshot()).toBe('a:1');
      expect(callCount).toBe(1);

      label.actions.setLabel('b');
      expect(derived.getSnapshot()).toBe('b:1');
      expect(callCount).toBe(2);

      unsub();
    });
  });

  test.describe('equality — Object.is default', () => {
    test('notifies when derived object is a new reference (Object.is)', () => {
      const counter = makeCounter(0);
      const label = makeLabel('x');

      // Derive returns a new object each time — Object.is sees different refs
      const derived = createDerivedStore([counter, label], (c, _l) => ({
        doubled: c.count * 2,
      }));

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      // Changing label triggers recompute, new object ref → Object.is → notify
      label.actions.setLabel('y');
      expect(callCount).toBe(1);
      expect(derived.getSnapshot()).toEqual({ doubled: 0 });

      unsub();
    });

    test('suppresses notification for primitive derives with same value', () => {
      const counter = makeCounter(0);
      const label = makeLabel('x');
      const derived = createDerivedStore([counter, label], (c, _l) => c.count * 2);

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      // Changing label triggers recompute, but result is still 0 → Object.is → skip
      label.actions.setLabel('y');
      expect(callCount).toBe(0);

      unsub();
    });

    test('notifies when derived object values actually change', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => ({ doubled: c.count * 2 }));

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      counter.actions.increment();
      expect(callCount).toBe(1);
      expect(derived.getSnapshot()).toEqual({ doubled: 2 });

      unsub();
    });
  });

  test.describe('equality — shallowEqual override', () => {
    test('suppresses notification when derived object has same values', () => {
      const counter = makeCounter(0);
      const label = makeLabel('x');

      const derived = createDerivedStore([counter, label], (c, _l) => ({ doubled: c.count * 2 }), {
        equals: shallowEqual,
      });

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      // Changing label triggers recompute, but doubled stays 0 → shallowEqual → no notify
      label.actions.setLabel('y');
      expect(callCount).toBe(0);
      expect(derived.getSnapshot()).toEqual({ doubled: 0 });

      unsub();
    });
  });

  test.describe('equality — custom equals override', () => {
    test('Object.is override works for primitive derives', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count > 0);

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      // 0 → 1: isPositive changes false → true → notify
      counter.actions.increment();
      expect(callCount).toBe(1);
      expect(derived.getSnapshot()).toBe(true);

      // 1 → 2: isPositive stays true → Object.is(true, true) → skip
      counter.actions.increment();
      expect(callCount).toBe(1);

      unsub();
    });

    test('custom always-different equals notifies on every change', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count, { equals: () => false });

      let callCount = 0;
      const unsub = derived.subscribe(() => {
        callCount++;
      });

      counter.actions.increment();
      counter.actions.increment();
      expect(callCount).toBe(2);

      unsub();
    });
  });

  test.describe('lazy subscription', () => {
    test('does not subscribe to sources until first listener', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count * 2);

      // Mutate source — no listeners on derived, so derived should not track
      counter.actions.increment();
      // getSnapshot still returns eagerly computed initial value
      expect(derived.getSnapshot()).toBe(0);
    });

    test('catches up on first subscribe', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count * 2);

      counter.actions.increment(); // derived is not listening yet

      // On subscribe, it recomputes to catch up
      const unsub = derived.subscribe(() => {
        /* noop */
      });
      expect(derived.getSnapshot()).toBe(2);

      unsub();
    });

    test('unsubscribes from sources when last listener removes', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count * 2);

      const unsub1 = derived.subscribe(() => {
        /* noop */
      });
      const unsub2 = derived.subscribe(() => {
        /* noop */
      });

      counter.actions.increment();
      expect(derived.getSnapshot()).toBe(2);

      unsub1();
      // Still one listener — should keep tracking
      counter.actions.increment();
      expect(derived.getSnapshot()).toBe(4);

      unsub2();
      // No listeners — stops tracking. Mutations are missed.
      counter.actions.increment();
      expect(derived.getSnapshot()).toBe(4); // stale — not tracking
    });

    test('re-subscribes when a new listener is added after full unsubscribe', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count * 2);

      const unsub1 = derived.subscribe(() => {
        /* noop */
      });
      counter.actions.increment();
      expect(derived.getSnapshot()).toBe(2);
      unsub1();

      // Mutate while disconnected
      counter.actions.increment();
      counter.actions.increment();

      // Re-subscribe — should catch up
      const unsub2 = derived.subscribe(() => {
        /* noop */
      });
      expect(derived.getSnapshot()).toBe(6);

      unsub2();
    });
  });

  test.describe('StoreContract compatibility', () => {
    test('has subscribe and getSnapshot methods', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count);
      expect(typeof derived.subscribe).toBe('function');
      expect(typeof derived.getSnapshot).toBe('function');
    });
  });

  test.describe('listenerCount', () => {
    test('listenerCount is 0 before any subscriber', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count);
      expect(derived.listenerCount).toBe(0);
    });

    test('listenerCount is 1 while one subscriber is active', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count);
      derived.subscribe(() => {});
      expect(derived.listenerCount).toBe(1);
    });

    test('listenerCount returns to 0 after unsubscribe', () => {
      const counter = makeCounter(0);
      const derived = createDerivedStore([counter], (c) => c.count);
      const unsub = derived.subscribe(() => {});
      unsub();
      expect(derived.listenerCount).toBe(0);
    });

    test('listenerCount > 0 correlates with lazy source subscription being active', () => {
      let sourceListenerCount = 0;
      const source = createStore({ value: 1 }, () => ({ actions: {} }));
      // Wrap source in a proxy that counts active subscriptions without mutating readonly props
      const trackedSource = {
        getSnapshot: () => source.getSnapshot(),
        get listenerCount() {
          return source.listenerCount;
        },
        subscribe: (listener: () => void) => {
          sourceListenerCount++;
          const unsub = source.subscribe(listener);
          return () => {
            sourceListenerCount--;
            unsub();
          };
        },
      };

      const derived = createDerivedStore([trackedSource], (s) => s.value);

      expect(derived.listenerCount).toBe(0);
      expect(sourceListenerCount).toBe(0);

      const unsub = derived.subscribe(() => {});
      expect(derived.listenerCount).toBe(1);
      expect(sourceListenerCount).toBe(1);

      unsub();
      expect(derived.listenerCount).toBe(0);
      expect(sourceListenerCount).toBe(0);
    });
  });
});
