import { createSingleFlight, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { ExampleLayout } from '@/entities/example';

let networkHits = 0;

const fetchConfig = (): Promise<{ theme: string; version: string }> =>
  new Promise((resolve) => {
    networkHits++;
    setTimeout(() => {
      resolve({ theme: 'dark', version: '2.0.0' });
    }, 800);
  });

const loadFlight = createSingleFlight();

const configStore = createStore(
  {
    config: null as { theme: string; version: string } | null,
    calls: 0,
    hits: 0,
  },
  ({ set, get }) => ({
    load() {
      set({ ...get(), calls: get().calls + 1 });
      return loadFlight(() =>
        fetchConfig().then((config) => {
          set({ ...get(), config, hits: networkHits });
        })
      );
    },
    reset() {
      set({ config: null, calls: 0, hits: 0 });
      networkHits = 0;
    },
  })
);

const loadThree = () => {
  void configStore.load();
  void configStore.load();
  void configStore.load();
};

export function SingleFlightExample() {
  const { config, calls, hits } = useStore(configStore);

  return (
    <ExampleLayout result={config ? `${config.theme} / ${config.version}` : 'not loaded'}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          void configStore.load();
        }}
      >
        load()
      </Button>
      <Button variant="outlined" size="small" onClick={loadThree}>
        load() × 3 (concurrent)
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        onClick={() => {
          configStore.reset();
        }}
      >
        Reset
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ width: '100%' }}>
        {String(calls)} call{calls !== 1 ? 's' : ''} dispatched → <strong>{String(hits)}</strong>{' '}
        actual network hit{hits !== 1 ? 's' : ''}
      </Typography>
      <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
        {Array.from({ length: calls }, (_, i) => (
          <Chip
            key={i}
            label={`call ${String(i + 1)}`}
            size="small"
            color={i < hits ? 'primary' : 'default'}
            variant={i < hits ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
    </ExampleLayout>
  );
}
