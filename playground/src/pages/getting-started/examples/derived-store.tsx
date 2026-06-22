import { connectDebugLog, createDerivedStore, createStore, shallowEqual } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

const cartStore = createStore({ items: [] as string[] }, ({ set, get }) => ({
  addItem(item: string) {
    set({ items: [...get().items, item] });
  },
  clearCart() {
    set({ items: [] });
  },
}));

connectDebugLog(cartStore, { name: 'cart' });

const summaryStore = createDerivedStore(
  [cartStore],
  (state) => ({
    count: state.items.length,
    isEmpty: state.items.length === 0,
    label:
      state.items.length === 0 ? 'Empty cart' : `${String(state.items.length)} item(s) in cart`,
  }),
  { equals: shallowEqual }
);

const ITEMS = ['Apple', 'Banana', 'Cherry'];

export function DerivedStoreExample() {
  const { label, isEmpty } = useStore(summaryStore);

  return (
    <ExampleLayout result={label}>
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {ITEMS.map((item) => (
          <Button
            key={item}
            variant="outlined"
            size="small"
            onClick={() => {
              cartStore.addItem(item);
            }}
          >
            Add {item}
          </Button>
        ))}
        <Button
          variant="outlined"
          size="small"
          color="error"
          disabled={isEmpty}
          onClick={() => {
            cartStore.clearCart();
          }}
        >
          Clear
        </Button>
      </Stack>
      <Chip label={label} size="small" color={isEmpty ? 'default' : 'primary'} />
    </ExampleLayout>
  );
}
