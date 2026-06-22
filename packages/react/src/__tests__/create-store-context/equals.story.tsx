import { useLayoutEffect, useRef } from 'react';
import { createStore, shallowEqual } from '@stardust/core';
import { createStoreContext } from '@stardust/react';

const PosCtx = createStoreContext(
  () =>
    createStore({ x: 0, y: 0, label: 'origin' }, ({ update }) => ({
      nudgeLabel() {
        update((d) => {
          d.label = 'nudged';
        });
      },
    })),
  { name: 'Pos' }
);

function PosInner() {
  const store = PosCtx.useStoreContext();
  const pos = PosCtx.useSnapshot((s) => ({ x: s.x, y: s.y }), shallowEqual);
  const countRef = useRef(0);
  const spanRef = useRef<HTMLSpanElement>(null);

  // Write render count directly to DOM — no state update, no cascading renders.
  useLayoutEffect(() => {
    countRef.current += 1;
    if (spanRef.current !== null) {
      spanRef.current.textContent = String(countRef.current);
    }
  });

  return (
    <div>
      <span data-testid="x">{pos.x}</span>
      <span data-testid="renders" ref={spanRef} />
      <button onClick={store.nudgeLabel}>Nudge label</button>
    </div>
  );
}

/**
 * useSnapshot with shallowEqual — a label-only mutation does not re-render the
 * component because x and y are unchanged.
 */
export function EqualsContextHarness() {
  return (
    <PosCtx.Provider>
      <PosInner />
    </PosCtx.Provider>
  );
}
