import { createStore } from '@stardust/core';
import { createStoreContext } from '@stardust/react';

const CounterCtx = createStoreContext(
  () =>
    createStore({ count: 0 }, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
        decrement() {
          update((d) => {
            d.count -= 1;
          });
        },
      },
    })),
  { name: 'Counter' }
);

function CounterInner() {
  const store = CounterCtx.useStoreContext();
  const count = CounterCtx.useSnapshot((s) => s.count);
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={store.actions.increment}>Increment</button>
      <button onClick={store.actions.decrement}>Decrement</button>
    </div>
  );
}

/**
 * Basic counter — verifies per-mount store creation, useStoreContext, and
 * useSnapshot with a selector.
 */
export function CounterContextHarness() {
  return (
    <CounterCtx.Provider>
      <CounterInner />
    </CounterCtx.Provider>
  );
}
