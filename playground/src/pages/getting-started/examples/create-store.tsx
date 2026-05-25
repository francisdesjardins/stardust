import { connectDebugLog, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

const counterStore = createStore({ count: 0 }, ({ set, get }) => {
  const self = {
    increment() {
      set({ count: get().count + 1 });
    },
    decrement() {
      set({ count: get().count - 1 });
    },
    reset() {
      set({ count: 0 });
    },
  };

  return self;
});

connectDebugLog(counterStore, { name: 'counter' });

export function CreateStoreExample() {
  const { count } = useStore(counterStore);

  return (
    <ExampleLayout result={`count: ${String(count)}`}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          counterStore.decrement();
        }}
      >
        −
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          counterStore.reset();
        }}
      >
        Reset
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          counterStore.increment();
        }}
      >
        +
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', ml: 1 }}>
        count = {count}
      </Typography>
    </ExampleLayout>
  );
}
