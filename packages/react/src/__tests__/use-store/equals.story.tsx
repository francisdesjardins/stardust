import { useState } from 'react';
import { createStore, shallowEqual } from '@stardust/core';
import { useStore } from '@stardust/react';

type State = { x: number; y: number; unrelated: string };

// Each harness gets its own store instance to avoid cross-test state pollution.

function makeStore() {
  return createStore<State, { setX(n: number): void; setUnrelated(s: string): void }>(
    { x: 0, y: 0, unrelated: 'a' },
    ({ setByPath }) => ({
      setX(n: number) {
        setByPath('x', n);
      },
      setUnrelated(s: string) {
        setByPath('unrelated', s);
      },
      
    })
  );
}

const equalsStore = makeStore();
const equalsRenderTrackStore = makeStore();

/**
 * Object-returning selector with `equals: shallowEqual`.
 *
 * `select` returns `{ x, y }` — a new object reference on every store
 * notification. Without `equals: shallowEqual` this would re-render on
 * every store change including unrelated fields. With it, re-renders only
 * happen when `x` or `y` actually change.
 *
 * Exposes `unrelated` via a full-snapshot subscription so tests can
 * confirm the store did update even when the slice did not trigger a re-render.
 */
export function EqualsHarness() {
  const slice = useStore(equalsStore, {
    select: (s) => ({ x: s.x, y: s.y }),
    equals: shallowEqual,
  });
  const { unrelated } = useStore(equalsStore);

  return (
    <div>
      <span data-testid="x">{slice.x}</span>
      <span data-testid="y">{slice.y}</span>
      <span data-testid="unrelated">{unrelated}</span>
      <button
        onClick={() => {
          equalsStore.setX(slice.x + 1);
        }}
      >
        Increment X
      </button>
      <button
        onClick={() => {
          equalsStore.setUnrelated('changed');
        }}
      >
        Change Unrelated
      </button>
    </div>
  );
}

/**
 * Tracks re-renders caused by the `equals` subscription using `useState`.
 * Changing `unrelated` must NOT increment the counter; changing `x` must.
 */
export function EqualsRenderTrackHarness() {
  const slice = useStore(equalsRenderTrackStore, {
    select: (s) => ({ x: s.x, y: s.y }),
    equals: shallowEqual,
  });

  return (
    <RenderTracker
      x={slice.x}
      onIncrementX={() => {
        equalsRenderTrackStore.setX(slice.x + 1);
      }}
      onChangeUnrelated={() => {
        equalsRenderTrackStore.setUnrelated('changed');
      }}
    />
  );
}

function RenderTracker({
  x,
  onIncrementX,
  onChangeUnrelated,
}: {
  readonly x: number;
  readonly onIncrementX: () => void;
  readonly onChangeUnrelated: () => void;
}) {
  const [renderCount, setRenderCount] = useState(0);

  return (
    <div>
      <span data-testid="x">{x}</span>
      <span data-testid="render-count">{renderCount}</span>
      <button onClick={onIncrementX}>Increment X</button>
      <button onClick={onChangeUnrelated}>Change Unrelated</button>
      <button
        onClick={() => {
          setRenderCount((c) => c + 1);
        }}
      >
        Track Render
      </button>
    </div>
  );
}
