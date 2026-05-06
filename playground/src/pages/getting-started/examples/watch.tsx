import { connectDebugLog, createStore, watch } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Chip, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { ExampleLayout } from '@/entities/example';

const temperatureStore = createStore({ celsius: 20 }, ({ set, get }) => ({
  actions: {
    increase() {
      set({ celsius: get().celsius + 5 });
    },
    decrease() {
      set({ celsius: get().celsius - 5 });
    },
  },
}));

connectDebugLog(temperatureStore, { name: 'temperature' });

export function WatchExample() {
  const { celsius } = useStore(temperatureStore);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    return watch(temperatureStore, (next, prev) => {
      if (next.celsius !== prev.celsius) {
        const direction = next.celsius > prev.celsius ? '↑' : '↓';
        setEvents((e) => [`${direction} ${String(next.celsius)}°C`, ...e].slice(0, 5));
      }
    });
  }, []);

  return (
    <ExampleLayout result={`${String(celsius)}°C`}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          temperatureStore.actions.decrease();
        }}
      >
        −5°C
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          temperatureStore.actions.increase();
        }}
      >
        +5°C
      </Button>
      <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
        {events.map((e, i) => (
          <Chip key={i} label={e} size="small" variant="outlined" />
        ))}
      </Stack>
    </ExampleLayout>
  );
}
