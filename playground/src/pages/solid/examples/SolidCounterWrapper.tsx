import { connectDebugLog, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { render } from 'solid-js/web';
import { SolidCounter } from './solid-counter.solid';

const sharedStore = createStore({ count: 0 }, ({ set, get }) => ({
  actions: {
    increment() {
      set({ count: get().count + 1 });
    },
    decrement() {
      set({ count: get().count - 1 });
    },
  },
}));

connectDebugLog(sharedStore, { name: 'shared-counter' });

function SolidIsland() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // Create the Solid tree inside the render root so Solid signals and
    // cleanups are tracked correctly.
    return render(
      () =>
        SolidCounter({ store: sharedStore, label: 'SolidJS island' }) as unknown as Parameters<
          typeof render
        >[0] extends () => infer R
          ? R
          : never,
      ref.current
    );
  }, []);

  return <div ref={ref} />;
}

export function SolidCounterWrapper() {
  const { count } = useStore(sharedStore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Typography variant="caption" color="text.secondary">
          React
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            sharedStore.actions.decrement();
          }}
        >
          −
        </Button>
        <Typography variant="body2" sx={{ minWidth: '2ch', textAlign: 'center' }}>
          {count}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            sharedStore.actions.increment();
          }}
        >
          +
        </Button>
      </div>
      <SolidIsland />
    </div>
  );
}
