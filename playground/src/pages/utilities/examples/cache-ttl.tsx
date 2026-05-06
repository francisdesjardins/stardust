import {
  cachedFresh,
  connectDebugLog,
  createCachedSlice,
  createStore,
  getCachedData,
} from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { cachedStatusColor, ExampleLayout } from '@/entities/example';

const INTERVAL = 4_000; // ms

type Counter = { value: number; refreshedAt: string };

const initial: Counter = { value: 0, refreshedAt: 'never' };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Starts fresh with a 4 s TTL. The timer begins ticking from module load.
const store = createStore(cachedFresh(initial, Date.now() + INTERVAL), (api) => ({
  actions: {
    cache: createCachedSlice(api, {
      keepPreviousData: true,
      onExpire: async (prev) => {
        await sleep(1_200);
        return { value: (prev?.value ?? 0) + 1, refreshedAt: new Date().toLocaleTimeString() };
      },
    }),
  },
}));

connectDebugLog(store, { name: 'cache-ttl' });

export function CacheTtlExample() {
  const state = useStore(store);
  const [autoRunning, setAutoRunning] = useState(false);
  const data = getCachedData(state) ?? initial;

  function startAuto() {
    setAutoRunning(true);
    store.actions.cache.startAutoRefresh({ expiresAfter: INTERVAL });
  }

  function stopAuto() {
    setAutoRunning(false);
    store.actions.cache.stopAutoRefresh();
  }

  function reset() {
    store.actions.cache.stopAutoRefresh();
    store.actions.cache.set(initial, Date.now() + INTERVAL);
    setAutoRunning(false);
  }

  return (
    <ExampleLayout
      result={`value: ${String(data.value)} · refreshed ${data.refreshedAt} · ${state.status}`}
    >
      <Stack direction="column" sx={{ gap: 1, width: '100%' }}>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ flexShrink: 0 }}>
            Cache status:
          </Typography>
          <Chip label={state.status} color={cachedStatusColor[state.status]} size="small" />
        </Stack>

        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={startAuto} disabled={autoRunning}>
            Start auto-refresh ({INTERVAL / 1_000}s)
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="warning"
            onClick={stopAuto}
            disabled={!autoRunning}
          >
            Stop auto-refresh
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              store.actions.cache.expire();
            }}
          >
            Expire now
          </Button>
          <Button variant="outlined" size="small" onClick={reset}>
            Reset
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          The store starts fresh with a {INTERVAL / 1_000}s TTL. Arm auto-refresh to watch the full
          cycle: <code>fresh → expired → pending → fresh</code>. Stopping only disables the fetch —
          the <code>fresh → expired</code> transition keeps firing so expiry stays observable.
        </Typography>
      </Stack>
    </ExampleLayout>
  );
}
