import { createDerivedStore, createStore, shallowEqual } from '@stardust/core';
import { useStore } from '@stardust/react';

const countStore = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count += 1;
    });
  },
}));

const labelStore = createStore({ label: 'hello' }, ({ update }) => ({
  setLabel(v: string) {
    update((d) => {
      d.label = v;
    });
  },
}));

const summaryStore = createDerivedStore(
  [countStore, labelStore],
  (c, l) => ({ text: `${l.label}:${String(c.count)}` }),
  { equals: shallowEqual }
);

/**
 * Multi-source derived store — combines count and label into a summary.
 */
export function DerivedMultiHarness() {
  const { text } = useStore(summaryStore);

  return (
    <div>
      <span data-testid="summary">{text}</span>
      <button
        onClick={() => {
          countStore.increment();
        }}
      >
        Increment
      </button>
      <button
        onClick={() => {
          labelStore.setLabel('world');
        }}
      >
        Set Label
      </button>
    </div>
  );
}
