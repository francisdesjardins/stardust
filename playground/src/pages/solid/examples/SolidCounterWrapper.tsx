import { connectDebugLog, createStore } from '@stardust/core';
import { useStore } from '@stardust/react';
import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { render } from 'solid-js/web';
import { SolidCounter } from './solid-counter.solid';

const sharedStore = createStore({ count: 0 }, ({ set, get }) => ({
  increment() {
    set({ count: get().count + 1 });
  },
  decrement() {
    set({ count: get().count - 1 });
  },
}));

connectDebugLog(sharedStore, { name: 'shared-counter' });

function SolidIsland() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // SolidCounter is called as a plain function (not JSX) to avoid the React
    // JSX transform being applied to SolidJS JSX. The return type cast is
    // necessary because React and SolidJS both declare JSX.Element locally.
    const node = SolidCounter({ store: sharedStore, label: 'SolidJS island' }) as unknown;
    return render(
      () => node as Parameters<typeof render>[0] extends () => infer R ? R : never,
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
            sharedStore.decrement();
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
            sharedStore.increment();
          }}
        >
          +
        </Button>
      </div>
      <SolidIsland />
    </div>
  );
}
