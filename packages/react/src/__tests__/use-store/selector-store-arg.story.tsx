import type { StoreApi } from '@stardust/core';
import { createStore } from '@stardust/core';
import { useStore } from '@stardust/react';

type PricingState = { basePrice: number };

// Each harness gets its own store instance to avoid cross-test state pollution.

function makePricingStore() {
  return createStore({ basePrice: 100 }, ({ get, update }: StoreApi<PricingState>) => ({
    getTotal(): number {
      return get().basePrice * 1.2;
    },
    setBase(n: number) {
      update((d) => {
        d.basePrice = n;
      });
    },
    
  }));
}

const selectorStoreArgStore = makePricingStore();

/**
 * Selector receives the store as its second argument — domain method callable
 * without closing over the store variable.
 */
export function SelectorStoreArgHarness() {
  const total = useStore(selectorStoreArgStore, (_s, store) => store.getTotal());

  return (
    <div>
      <span data-testid="total">{total}</span>
      <button
        onClick={() => {
          selectorStoreArgStore.setBase(200);
        }}
      >
        Set 200
      </button>
    </div>
  );
}
