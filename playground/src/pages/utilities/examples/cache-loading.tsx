import {
  cachedFresh,
  connectDebugLog,
  createCachedSlice,
  createStore,
  getCachedData,
} from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { cachedStatusColor, ExampleLayout } from '@/entities/example';

type Profile = { name: string; role: string };

const initial: Profile = { name: 'Nova', role: 'admin' };
const placeholder: Profile = { name: '…', role: '…' };
const names = ['Nova', 'Aster', 'Lyra', 'Vega'];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Two independent stores — one per loading strategy so both are observable simultaneously.
const storePlaceholder = createStore(cachedFresh(initial), (api) => ({
  actions: {
    cache: createCachedSlice(api),
  },
}));

const storeKeepPrev = createStore(cachedFresh(initial), (api) => ({
  actions: {
    cache: createCachedSlice(api),
  },
}));

connectDebugLog(storePlaceholder, { name: 'cache-loading:placeholder' });
connectDebugLog(storeKeepPrev, { name: 'cache-loading:keep-prev' });

function nextProfile(prev: Profile | undefined): Profile {
  const base = prev ?? initial;
  const idx = names.indexOf(base.name);
  return { name: names[(idx + 1) % names.length] ?? initial.name, role: base.role };
}

export function CacheLoadingExample() {
  const stateA = useStore(storePlaceholder);
  const stateB = useStore(storeKeepPrev);
  const dataA = getCachedData(stateA) ?? initial;
  const dataB = getCachedData(stateB) ?? initial;

  async function refreshA() {
    await storePlaceholder.actions.cache.refresh(
      async (prev) => {
        await sleep(1_200);
        return nextProfile(prev);
      },
      { placeholder }
    );
  }

  async function refreshB() {
    await storeKeepPrev.actions.cache.refresh(
      async (prev) => {
        await sleep(1_200);
        return nextProfile(prev);
      },
      { keepPreviousData: true }
    );
  }

  return (
    <ExampleLayout result={`placeholder: ${dataA.name} · keepPrevious: ${dataB.name}`}>
      <Stack direction="row" sx={{ gap: 2, width: '100%' }}>
        <Stack direction="column" sx={{ gap: 1, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            placeholder
          </Typography>
          <Chip
            label={stateA.status}
            color={cachedStatusColor[stateA.status]}
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
          <Typography>
            {dataA.name} ({dataA.role})
          </Typography>
          <Button variant="outlined" size="small" onClick={() => void refreshA()}>
            Refresh
          </Button>
          <Typography variant="caption" color="text.secondary">
            During <code>pending</code>, <code>.data</code> holds the placeholder — previous content
            is gone.
          </Typography>
        </Stack>

        <Divider orientation="vertical" flexItem />

        <Stack direction="column" sx={{ gap: 1, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            keepPreviousData
          </Typography>
          <Chip
            label={stateB.status}
            color={cachedStatusColor[stateB.status]}
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
          <Typography>
            {dataB.name} ({dataB.role})
          </Typography>
          <Button variant="outlined" size="small" onClick={() => void refreshB()}>
            Refresh
          </Button>
          <Typography variant="caption" color="text.secondary">
            During <code>pending</code>, <code>.data</code> retains the previous value — UI stays
            populated.
          </Typography>
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
