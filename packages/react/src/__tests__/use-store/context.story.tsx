import type { StoreApi } from '@stardust/core';
import { shallowEqual } from '@stardust/core';
import { createStore } from '@stardust/core';
import { useStore } from '@stardust/react';

type PricingCtx = { taxRate: number };
type PricingState = { basePrice: number };

// Each harness gets its own store instance to avoid cross-test state pollution.

function makePricingStore() {
  return createStore(
    { basePrice: 100 },
    ({ get, getContext }: StoreApi<PricingState, PricingCtx>) => ({
      getTotal(): number {
        return get().basePrice * (1 + getContext().taxRate);
      },
    })
  );
}

const contextStore = makePricingStore();
const selectorContextStore = makePricingStore();

/**
 * Context-only (no selector) — verifies context is bound and accessible
 * inside a store method called from an event handler.
 */
export function ContextHarness() {
  // getTotal() is called inside the selector so it runs within useSyncExternalStore's
  // snapshot cycle — the React Compiler cannot memoize it away.
  const { base, total } = useStore(contextStore, {
    select: (snapshot) => ({ base: snapshot.basePrice, total: contextStore.getTotal() }),
    context: { taxRate: 1 },
    equals: shallowEqual,
  });

  return (
    <div>
      <span data-testid="base">{base}</span>
      <span data-testid="total">{total}</span>
      <button
        onClick={() => {
          contextStore.setByPath('basePrice', 200);
        }}
      >
        Set 200
      </button>
    </div>
  );
}

/**
 * Selector + context — verifies both work together.
 */
export function ContextWithSelectorHarness() {
  // Same pattern: getTotal() inside the selector to stay within useSyncExternalStore.
  const { base, total } = useStore(selectorContextStore, {
    select: (snapshot) => ({
      base: snapshot.basePrice,
      total: selectorContextStore.getTotal(),
    }),
    context: { taxRate: 3 },
    equals: shallowEqual,
  });

  return (
    <div>
      <span data-testid="base">{base}</span>
      <span data-testid="total">{total}</span>
      <button
        onClick={() => {
          selectorContextStore.setByPath('basePrice', 50);
        }}
      >
        Set 50
      </button>
    </div>
  );
}
