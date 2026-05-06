import { connectDebugLog, createStore, createStoreDispatch } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';

type Action = 'increment' | 'decrement' | 'reset';

const counterStore = createStore({ count: 0 }, ({ set, get }) => ({
  actions: {
    increment() {
      set({ count: get().count + 1 });
    },
    decrement() {
      set({ count: get().count - 1 });
    },
    reset() {
      set({ count: 0 });
    },
  },
}));

connectDebugLog(counterStore, { name: 'counter' });

// Full dispatch — all domain methods reachable
const dispatch = createStoreDispatch(counterStore);

// Restricted dispatch — reset excluded at the type level
const safeDispatch = createStoreDispatch(counterStore, {
  domain: ['increment', 'decrement'],
});

// The key use case: action names are data — loop over them
const SEQUENCES: { label: string; actions: Action[] }[] = [
  { label: '+3', actions: ['increment', 'increment', 'increment'] },
  { label: '−2', actions: ['decrement', 'decrement'] },
  { label: 'bounce', actions: ['increment', 'increment', 'decrement'] },
  { label: 'reset', actions: ['reset'] },
];

export function StoreDispatchExample() {
  const { count } = useStore(counterStore);
  const [log, setLog] = useState<Action[]>([]);

  const run = (actions: Action[]) => {
    for (const action of actions) {
      dispatch(action);
    }
    setLog((prev) => [...actions, ...prev].slice(0, 8));
  };

  const safeRun = (action: 'increment' | 'decrement') => {
    safeDispatch(action);
    setLog((prev) => [action, ...prev].slice(0, 8));
  };

  return (
    <ExampleLayout result={`count: ${String(count)}`}>
      <Stack direction="column" sx={{ gap: 1, width: '100%' }}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {SEQUENCES.map(({ label, actions }) => (
            <Button
              key={label}
              variant="outlined"
              size="small"
              onClick={() => {
                run(actions);
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>

        {/* Live log — chips appear as actions are dispatched */}
        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', minHeight: 24 }}>
          {log.map((a, i) => (
            <Chip
              key={i}
              label={a}
              size="small"
              variant="outlined"
              color={a === 'reset' ? 'error' : a === 'increment' ? 'success' : 'default'}
            />
          ))}
          {log.length === 0 && (
            <Typography variant="caption" color="text.disabled">
              dispatched actions appear here
            </Typography>
          )}
        </Stack>

        {/* safeDispatch — reset excluded at the type level */}
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              safeRun('increment');
            }}
          >
            safeDispatch("increment")
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              safeRun('decrement');
            }}
          >
            safeDispatch("decrement")
          </Button>
          <Typography variant="caption" color="text.secondary">
            "reset" excluded — type error if you try
          </Typography>
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
