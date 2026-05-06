import { connectDebugLog, createSingleFlight, createStore } from '@stardust/core';
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
    resolved: 0,
    hits: 0,
  },
  ({ set, get }) => ({
    actions: {
      load() {
        set({ ...get(), calls: get().calls + 1 });
        return loadFlight(() =>
          fetchConfig().then((config) => {
            // All callers that joined this flight receive the result simultaneously
            set({ ...get(), config, hits: networkHits, resolved: get().calls });
          })
        );
      },
      reset() {
        set({ config: null, calls: 0, resolved: 0, hits: 0 });
        networkHits = 0;
      },
    },
  })
);

connectDebugLog(configStore, { name: 'config' });

const loadThree = () => {
  void configStore.actions.load();
  void configStore.actions.load();
  void configStore.actions.load();
};

export function SingleFlightExample() {
  const { config, calls, resolved, hits } = useStore(configStore);

  return (
    <ExampleLayout result={config ? `${config.theme} / ${config.version}` : 'not loaded'}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          void configStore.actions.load();
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
          configStore.actions.reset();
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
            color={i < resolved ? 'success' : 'default'}
            variant={i < resolved ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
    </ExampleLayout>
  );
}
