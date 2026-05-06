import { createDerivedStore, createStore, shallowEqual } from '@stardust/core';
import { useStore } from '@stardust/react';

const counterStore = createStore({ count: 0 }, ({ update, reset }) => ({
  actions: {
    increment() {
      update((d) => {
        d.count += 1;
      });
    },
    reset,
  },
}));

const doubledStore = createDerivedStore([counterStore], (c) => ({ doubled: c.count * 2 }), {
  equals: shallowEqual,
});

/**
 * Single-source derived store — `doubled` recomputes when counter changes.
 */
export function DerivedSingleHarness() {
  const { doubled } = useStore(doubledStore);
  const { count } = useStore(counterStore);

  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="doubled">{doubled}</span>
      <button
        onClick={() => {
          counterStore.actions.increment();
        }}
      >
        Increment
      </button>
      <button
        onClick={() => {
          counterStore.actions.reset();
        }}
      >
        Reset
      </button>
    </div>
  );
}
