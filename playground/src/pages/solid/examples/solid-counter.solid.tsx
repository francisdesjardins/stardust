import { useStore } from '@stardust/solid';
import type { Store } from '@stardust/core';

type CountState = { count: number };
type CountActions = { increment: () => void; decrement: () => void };

type SolidCounterProps = {
  store: Store<CountState, CountActions>;
  label?: string;
};

export function SolidCounter({ store, label = 'SolidJS' }: SolidCounterProps) {
  const state = useStore(store);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '0.75rem', color: '#888' }}>{label}</span>
      <button
        onClick={() => {
          store.actions.decrement();
        }}
        style={{ padding: '4px 12px', cursor: 'pointer' }}
      >
        −
      </button>
      <span style={{ minWidth: '2ch', textAlign: 'center' }}>{state().count}</span>
      <button
        onClick={() => {
          store.actions.increment();
        }}
        style={{ padding: '4px 12px', cursor: 'pointer' }}
      >
        +
      </button>
    </div>
  );
}
