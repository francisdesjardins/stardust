import {
  cachedFresh,
  connectDebugLog,
  createCachedSlice,
  createStore,
  getCachedData,
} from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { cachedStatusColor, ExampleLayout } from '@/entities/example';

type Profile = { name: string; syncedAt: string };

const initial: Profile = { name: 'Nova', syncedAt: 'never' };

const store = createStore(cachedFresh(initial), (api) => ({
  actions: { cache: createCachedSlice(api) },
}));

connectDebugLog(store, { name: 'cache-manual' });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function CacheManualExample() {
  const state = useStore(store);
  const data = getCachedData(state) ?? initial;

  async function refresh() {
    await store.actions.cache.refresh(async (prev) => {
      await sleep(800);
      const base = prev ?? initial;
      return { name: base.name, syncedAt: new Date().toLocaleTimeString() };
    });
  }

  return (
    <ExampleLayout result={`${data.name} · synced ${data.syncedAt}`}>
      <Stack direction="column" sx={{ gap: 1, width: '100%' }}>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ flexShrink: 0 }}>
            Cache status:
          </Typography>
          <Chip label={state.status} color={cachedStatusColor[state.status]} size="small" />
        </Stack>

        <Button variant="outlined" size="small" onClick={() => void refresh()}>
          Refresh
        </Button>

        <Typography variant="caption" color="text.secondary">
          <code>refresh(fetcher)</code> is <strong>single-flight</strong> — clicking rapidly
          triggers only one network call. Concurrent callers share the same in-flight promise.
        </Typography>
      </Stack>
    </ExampleLayout>
  );
}
