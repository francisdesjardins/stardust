import { createStore } from '@stardust/core';
import { createStoreContext } from '@stardust/react';

/**
 * Store where the user defines a domain method named `reset` that sets count
 * to a hardcoded 0 — distinct from the built-in baseline restore.
 *
 * Regression harness: the default onUnmount must NOT call store.reset() because
 * it would invoke this domain method (not the built-in) during StrictMode's
 * onUnmount pass between double-mount cycles, resetting an initial count of 10 → 0.
 */
const DomainResetCtx = createStoreContext(
  (initial: { count: number }) =>
    createStore(initial, ({ set, get }) => ({
      actions: {
        increment() {
          set({ count: get().count + 1 });
        },
        reset() {
          set({ count: 0 });
        },
      },
    })),
  { name: 'DomainReset' }
);

function DomainResetInner() {
  const count = DomainResetCtx.useSnapshot((s) => s.count);
  const store = DomainResetCtx.useStoreContext();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={store.actions.reset}>Reset</button>
    </div>
  );
}

export function DomainResetHarness() {
  return (
    <DomainResetCtx.Provider initial={{ count: 10 }}>
      <DomainResetInner />
    </DomainResetCtx.Provider>
  );
}
