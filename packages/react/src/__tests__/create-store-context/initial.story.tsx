import { createStore } from '@stardust/core';
import { createStoreContext } from '@stardust/react';

const InitialCounterCtx = createStoreContext(
  (initial: { count: number }) =>
    createStore(initial, ({ update }) => ({
      actions: {
        increment() {
          update((d) => {
            d.count += 1;
          });
        },
      },
    })),
  { name: 'InitialCounter' }
);

function InitialCounterInner() {
  const store = InitialCounterCtx.useStoreContext();
  const count = InitialCounterCtx.useSnapshot((s) => s.count);
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={store.actions.increment}>Increment</button>
    </div>
  );
}

/**
 * Counter initialized via the `initial` prop — verifies the factory receives
 * props and the store starts with the supplied values.
 */
export function CounterWithInitialHarness() {
  return (
    <InitialCounterCtx.Provider initial={{ count: 10 }}>
      <InitialCounterInner />
    </InitialCounterCtx.Provider>
  );
}
