import type { StoreApi } from '@stardust/core';
import { createStore } from '@stardust/core';
import { createStoreContext } from '@stardust/react';

type TaxCtx = { taxRate: number };
type PricingState = { basePrice: number };

const PricingContext = createStoreContext(
  () =>
    createStore<PricingState, { getTotal: () => number }, TaxCtx>(
      { basePrice: 100 },
      ({ get, getContext }: StoreApi<PricingState, TaxCtx>) => ({
        actions: {
          getTotal(): number {
            return get().basePrice * (1 + getContext().taxRate);
          },
        },
      })
    ),
  { name: 'Pricing' }
);

function PricingInner() {
  const store = PricingContext.useStoreContext();
  const { basePrice } = PricingContext.useSnapshot();
  return (
    <div>
      <span data-testid="base">{basePrice}</span>
      <span data-testid="total">{Math.round(store.actions.getTotal())}</span>
    </div>
  );
}

/**
 * Pricing store with a `context` prop — verifies setContext is called on each
 * render and store methods can read the injected collaborator.
 * basePrice=100, taxRate=0.15 → total = 115.
 */
export function PricingContextHarness() {
  return (
    <PricingContext.Provider context={{ taxRate: 0.15 }}>
      <PricingInner />
    </PricingContext.Provider>
  );
}
