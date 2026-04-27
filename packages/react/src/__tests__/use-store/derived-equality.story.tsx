import { useState } from 'react';
import { createDerivedStore, createStore, shallowEqual } from '@stardust/core';
import { useStore } from '@stardust/react';

const counterStore = createStore({ count: 0 }, ({ update }) => ({
  increment() {
    update((d) => {
      d.count += 1;
    });
  },
}));

const labelStore = createStore({ label: 'x' }, ({ update }) => ({
  setLabel(v: string) {
    update((d) => {
      d.label = v;
    });
  },
}));

// Derive depends on both stores but only reads count — label changes should
// NOT trigger re-render because shallowEqual compares the result object
const countOnlyDerived = createDerivedStore(
  [counterStore, labelStore],
  (c, _l) => ({
    doubled: c.count * 2,
  }),
  { equals: shallowEqual }
);

/**
 * Demonstrates shallowEqual (explicit) suppressing re-renders when derived
 * value doesn't change despite source notification.
 */
export function DerivedEqualityHarness() {
  const { doubled } = useStore(countOnlyDerived);
  const [renderCount, setRenderCount] = useState(0);

  // Increment render counter on each render (after initial)
  // We use a ref trick: the component re-renders only when useStore
  // detects a change. We count via an effect-free approach.
  return (
    <RenderTracker
      doubled={doubled}
      renderCount={renderCount}
      onRender={() => {
        setRenderCount((c) => c + 1);
      }}
    />
  );
}

function RenderTracker({
  doubled,
  renderCount,
  onRender,
}: {
  readonly doubled: number;
  readonly renderCount: number;
  readonly onRender: () => void;
}) {
  return (
    <div>
      <span data-testid="doubled">{doubled}</span>
      <span data-testid="render-count">{renderCount}</span>
      <button
        onClick={() => {
          // Change label only — should NOT cause derived to re-notify
          labelStore.setLabel(`label-${String(Date.now())}`);
        }}
      >
        Change Label Only
      </button>
      <button
        onClick={() => {
          counterStore.increment();
        }}
      >
        Increment Counter
      </button>
      <button onClick={onRender}>Track Render</button>
    </div>
  );
}
