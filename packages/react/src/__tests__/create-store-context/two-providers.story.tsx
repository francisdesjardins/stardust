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
      },
    })),
  { name: 'TwoProviders' }
);

function CounterLabel({ label }: { label: string }) {
  const store = CounterCtx.useStoreContext();
  const count = CounterCtx.useSnapshot((s) => s.count);
  return (
    <div>
      <span data-testid={`count-${label}`}>{count}</span>
      <button data-testid={`inc-${label}`} onClick={store.actions.increment}>
        +
      </button>
    </div>
  );
}

/**
 * Two sibling Providers — verifies each mount gets its own isolated store
 * instance (incrementing one does not affect the other).
 */
export function TwoProvidersHarness() {
  return (
    <div>
      <CounterCtx.Provider>
        <CounterLabel label="a" />
      </CounterCtx.Provider>
      <CounterCtx.Provider>
        <CounterLabel label="b" />
      </CounterCtx.Provider>
    </div>
  );
}
