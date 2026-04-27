import type { StoreApi } from '@stardust/core';
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
  const snap = useStore(contextStore, { context: { taxRate: 1 } });

  return (
    <div>
      <span data-testid="base">{snap.basePrice}</span>
      <span data-testid="total">{contextStore.getTotal()}</span>
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
  const base = useStore(selectorContextStore, {
    select: (s) => s.basePrice,
    context: { taxRate: 3 },
  });

  return (
    <div>
      <span data-testid="base">{base}</span>
      <span data-testid="total">{selectorContextStore.getTotal()}</span>
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
