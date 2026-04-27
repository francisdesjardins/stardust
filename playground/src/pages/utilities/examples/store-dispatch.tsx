import { createStore, createStoreDispatch } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';

const counterStore = createStore({ count: 0 }, ({ set, get }) => ({
  increment() {
    set({ count: get().count + 1 });
  },
  decrement() {
    set({ count: get().count - 1 });
  },
  reset() {
    set({ count: 0 });
  },
}));

// All domain methods are dispatchable by default
const dispatch = createStoreDispatch(counterStore);

// Restricted dispatch — only increment/decrement reachable
const safeDispatch = createStoreDispatch(counterStore, { domain: ['increment', 'decrement'] });

type Action = 'increment' | 'decrement' | 'reset';

export function StoreDispatchExample() {
  const { count } = useStore(counterStore);
  const [history, setHistory] = useState<Action[]>([]);

  const fire = (action: Action) => {
    dispatch(action);
    setHistory((h) => [action, ...h].slice(0, 6));
  };

  return (
    <ExampleLayout result={`count: ${String(count)}`}>
      <Stack direction="column" sx={{ gap: 1, width: '100%' }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {(['increment', 'decrement', 'reset'] as const).map((action) => (
            <Button
              key={action}
              variant="outlined"
              size="small"
              onClick={() => {
                fire(action);
              }}
            >
              dispatch("{action}")
            </Button>
          ))}
        </Stack>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              safeDispatch('increment');
              setHistory((h) => (['increment', ...h] as Action[]).slice(0, 6));
            }}
          >
            safeDispatch("increment")
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            (reset not allowed — type error at compile time)
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
          {history.map((a, i) => (
            <Chip key={i} label={a} size="small" variant="outlined" />
          ))}
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
