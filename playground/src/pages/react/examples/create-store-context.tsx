import { connectDebugLog, createStore } from '@stardust/core';
import { createStoreContext } from '@stardust/react';
import { Button, Divider, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

const CounterCtx = createStoreContext((initial: { label: string; count: number }) => {
  const store = createStore(initial, ({ set, get }) => ({
    increment() {
      set({ ...get(), count: get().count + 1 });
    },
    reset() {
      set({ ...get(), count: 0 });
    },
    
  }));
  connectDebugLog(store, { name: `counter:${initial.label}` });
  return store;
});

function Counter({ title }: { title: string }) {
  const snap = CounterCtx.useSnapshot();
  const store = CounterCtx.useStoreContext();
  return (
    <Stack sx={{ gap: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            store.increment();
          }}
        >
          +
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          onClick={() => {
            store.reset();
          }}
        >
          Reset
        </Button>
        <Typography variant="body2">count = {snap.count}</Typography>
      </Stack>
    </Stack>
  );
}

export function CreateStoreContextExample() {
  return (
    <ExampleLayout result="Two independent store instances via context">
      <Stack sx={{ gap: 2, width: '100%' }}>
        <CounterCtx.Provider initial={{ label: 'A', count: 0 }}>
          <Counter title="Instance A" />
        </CounterCtx.Provider>
        <Divider />
        <CounterCtx.Provider initial={{ label: 'B', count: 10 }}>
          <Counter title="Instance B (starts at 10)" />
        </CounterCtx.Provider>
      </Stack>
    </ExampleLayout>
  );
}
