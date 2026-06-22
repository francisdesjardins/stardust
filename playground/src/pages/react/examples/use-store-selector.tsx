import type { StoreApi } from '@stardust/core';
import { connectDebugLog, createStore, shallowEqual } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

type CartState = { items: { name: string; price: number }[] };

const cartStore = createStore(
  { items: [] as CartState['items'] },
  ({ get, update }: StoreApi<CartState>) => ({
    subtotal(): number {
      return get().items.reduce((sum, item) => sum + item.price, 0);
    },
    tax(): number {
      return Math.round(get().items.reduce((sum, item) => sum + item.price, 0) * 0.15 * 100) / 100;
    },
    total(): number {
      const sub = get().items.reduce((sum, item) => sum + item.price, 0);
      return Math.round((sub + Math.round(sub * 0.15 * 100) / 100) * 100) / 100;
    },
    addItem(item: CartState['items'][number]) {
      update((d) => {
        d.items.push(item);
      });
    },
    clear() {
      update((d) => {
        d.items = [];
      });
    },
  })
);

connectDebugLog(cartStore, { name: 'cart' });

const ITEMS = [
  { name: 'Coffee', price: 4.5 },
  { name: 'Croissant', price: 3.25 },
  { name: 'Orange juice', price: 5.0 },
];

export function UseStoreSelectorExample() {
  // Domain methods are accessible via the store second argument —
  // no need to close over cartStore inside the selector.
  const { count, subtotal, tax, total } = useStore(cartStore, {
    select: (s, store) => ({
      count: s.items.length,
      subtotal: store.subtotal(),
      tax: store.tax(),
      total: store.total(),
    }),
    equals: shallowEqual,
  });

  return (
    <ExampleLayout result={`Total: $${total.toFixed(2)}`}>
      <Stack sx={{ gap: 1 }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {ITEMS.map((item) => (
            <Button
              key={item.name}
              variant="outlined"
              size="small"
              onClick={() => {
                cartStore.addItem(item);
              }}
            >
              + {item.name} (${item.price.toFixed(2)})
            </Button>
          ))}
          <Button
            variant="outlined"
            size="small"
            color="error"
            disabled={count === 0}
            onClick={() => {
              cartStore.clear();
            }}
          >
            Clear
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {count} item{count !== 1 ? 's' : ''} · subtotal ${subtotal.toFixed(2)} · tax $
          {tax.toFixed(2)} · total ${total.toFixed(2)}
        </Typography>
      </Stack>
    </ExampleLayout>
  );
}
