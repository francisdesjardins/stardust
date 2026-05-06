import { createStore } from '@stardust/core';
import { useStore } from '@stardust/react';

const counterStore = createStore({ count: 0 }, ({ set, update }) => ({
  actions: {
    increment() {
      update((draft) => {
        draft.count += 1;
      });
    },
    reset() {
      set({ count: 0 });
    },
  },
}));

/**
 * Selector subscription — re-renders only when `count` changes.
 */
export function SelectorHarness() {
  const count = useStore(counterStore, (s) => s.count);

  return (
    <div>
      <span data-testid="count">{count}</span>
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
