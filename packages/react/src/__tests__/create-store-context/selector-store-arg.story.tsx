import type { StoreApi } from '@stardust/core';
import { createStore } from '@stardust/core';
import { createStoreContext } from '@stardust/react';

type PricingState = { basePrice: number };

const PricingCtx = createStoreContext(
  () =>
    createStore({ basePrice: 100 }, ({ get, update }: StoreApi<PricingState>) => ({
      getTotal(): number {
        return get().basePrice * 1.2;
      },
      setBase(n: number) {
        update((d) => {
          d.basePrice = n;
        });
      },
    })),
  { name: 'Pricing' }
);

function PricingInner() {
  const store = PricingCtx.useStoreContext();
  // Domain method accessed via the store second argument — no extra useStoreContext call needed.
  const total = PricingCtx.useSnapshot((_s, store) => store.getTotal());

  return (
    <div>
      <span data-testid="total">{total}</span>
      <button
        onClick={() => {
          store.setBase(200);
        }}
      >
        Set 200
      </button>
    </div>
  );
}

/**
 * useSnapshot with store arg — domain method callable from the selector
 * without a separate useStoreContext call.
 */
export function SelectorStoreArgContextHarness() {
  return (
    <PricingCtx.Provider>
      <PricingInner />
    </PricingCtx.Provider>
  );
}
