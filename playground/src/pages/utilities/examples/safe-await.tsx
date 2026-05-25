import { connectDebugLog, createStore, safeAwait } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

let callCount = 0;

const fetchValue = (): Promise<{ value: number }> =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      callCount++;
      // Every 3rd call fails — easy to observe the error path
      if (callCount % 3 === 0) {
        reject(new Error(`Simulated network error (call #${String(callCount)})`));
      } else {
        resolve({ value: Math.floor(Math.random() * 100) });
      }
    }, 600)
  );

type LogEntry = { ok: boolean; msg: string };

const logStore = createStore({ entries: [] as LogEntry[], loading: false }, ({ set, get }) => ({
  async fetch() {
    set({ ...get(), loading: true });
    const [err, data] = await safeAwait(fetchValue());
    if (err !== null) {
      set({
        loading: false,
        entries: [{ ok: false, msg: err.message }, ...get().entries].slice(0, 6),
      });
    } else {
      set({
        loading: false,
        entries: [{ ok: true, msg: `value = ${String(data.value)}` }, ...get().entries].slice(
          0,
          6
        ),
      });
    }
  },
  clear() {
    set({ entries: [], loading: false });
    callCount = 0;
  },
  
}));

connectDebugLog(logStore, { name: 'log' });

export function SafeAwaitExample() {
  const { entries, loading } = useStore(logStore);

  return (
    <ExampleLayout result={loading ? 'loading…' : `${String(entries.length)} results`}>
      <Button
        variant="outlined"
        size="small"
        disabled={loading}
        onClick={() => {
          void logStore.fetch();
        }}
      >
        Fetch (fails every 3rd call)
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          logStore.clear();
        }}
      >
        Clear
      </Button>
      <Stack direction="column" sx={{ gap: 0.5, width: '100%' }}>
        {entries.map((e, i) => (
          <Chip
            key={i}
            label={e.msg}
            size="small"
            color={e.ok ? 'success' : 'error'}
            variant="outlined"
          />
        ))}
        {entries.length === 0 && (
          <Typography variant="body2" color="text.disabled">
            No results yet — click Fetch
          </Typography>
        )}
      </Stack>
    </ExampleLayout>
  );
}
