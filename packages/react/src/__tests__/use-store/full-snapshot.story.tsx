import { createStore } from '@stardust/core';
import { useStore } from '@stardust/react';

const counterStore = createStore({ count: 0 }, ({ set, update }) => ({
  increment() {
    update((draft) => {
      draft.count += 1;
    });
  },
  reset() {
    set({ count: 0 });
  },
  
}));

/**
 * Full snapshot subscription — re-renders on every store change.
 */
export function FullSnapshotHarness() {
  const snap = useStore(counterStore);

  return (
    <div>
      <span data-testid="count">{snap.count}</span>
      <button
        onClick={() => {
          counterStore.increment();
        }}
      >
        Increment
      </button>
      <button
        onClick={() => {
          counterStore.reset();
        }}
      >
        Reset
      </button>
    </div>
  );
}
