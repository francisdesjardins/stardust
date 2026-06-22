import { createStore } from '@stardust/core';
import { useStore } from '@stardust/react';

const formStore = createStore({ name: '', email: '', submitted: false }, ({ set, update }) => ({
  setField(key: 'name' | 'email', value: string) {
    update((draft) => {
      draft[key] = value;
    });
  },
  submit() {
    update((draft) => {
      draft.submitted = true;
    });
  },
  reset() {
    set({ name: '', email: '', submitted: false });
  },
}));

/**
 * Produce integration — uses draft-based mutations via the store.
 */
export function ProduceHarness() {
  const snap = useStore(formStore);

  return (
    <div>
      <span data-testid="name">{snap.name}</span>
      <span data-testid="email">{snap.email}</span>
      <span data-testid="submitted">{String(snap.submitted)}</span>
      <button
        onClick={() => {
          formStore.setField('name', 'Bob');
        }}
      >
        Set Name Bob
      </button>
      <button
        onClick={() => {
          formStore.setField('email', 'bob@test.com');
        }}
      >
        Set Email Bob
      </button>
      <button
        onClick={() => {
          formStore.submit();
        }}
      >
        Submit
      </button>
      <button
        onClick={() => {
          formStore.reset();
        }}
      >
        Reset
      </button>
    </div>
  );
}
