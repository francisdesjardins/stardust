import { connectDebugLog, createStore, type DiffResult } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

type LogEntry = { action: string; path: string; from: unknown; to: unknown };

const profileStore = createStore({ name: 'Alice', score: 0, active: true }, ({ set, get }) => ({
  rename(name: string) {
    set({ ...get(), name });
  },
  addScore() {
    set({ ...get(), score: get().score + 10 });
  },
  toggle() {
    set({ ...get(), active: !get().active });
  },
  reset() {
    set({ name: 'Alice', score: 0, active: true });
  },
}));

const logsStore = createStore({ entries: [] as LogEntry[] }, ({ set, get }) => ({
  push(action: string, diff: DiffResult) {
    const next = Object.entries(diff).map(([path, { from, to }]) => ({ action, path, from, to }));
    set({ entries: [...next, ...get().entries].slice(0, 8) });
  },
  clear() {
    set({ entries: [] });
  },
}));

connectDebugLog(profileStore, {
  name: 'profile',
  onLog(action, diff) {
    logsStore.push(action, diff);
  },
});

export function DebugLogExample() {
  const state = useStore(profileStore);
  const { entries } = useStore(logsStore);

  return (
    <ExampleLayout
      result={`${state.name} · score ${String(state.score)} · ${state.active ? 'active' : 'inactive'}`}
    >
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.rename('Bob');
        }}
      >
        Rename → Bob
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.rename('Alice');
        }}
      >
        Rename → Alice
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.addScore();
        }}
      >
        +10 score
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          profileStore.toggle();
        }}
      >
        Toggle ({state.active ? 'active' : 'inactive'})
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        onClick={() => {
          profileStore.reset();
          logsStore.clear();
        }}
      >
        Reset
      </Button>
      <Stack direction="column" sx={{ gap: 0.25, width: '100%', mt: 0.5 }}>
        {entries.map((e, i) => (
          <Typography key={i} variant="caption" sx={{ fontFamily: 'monospace' }}>
            <strong>{e.action}</strong> · {e.path}: {JSON.stringify(e.from)} →{' '}
            {JSON.stringify(e.to)}
          </Typography>
        ))}
        {entries.length === 0 && (
          <Typography variant="body2" color="text.disabled">
            Mutate the store to see a live diff log
          </Typography>
        )}
      </Stack>
    </ExampleLayout>
  );
}
