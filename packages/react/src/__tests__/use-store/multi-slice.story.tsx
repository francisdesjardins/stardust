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
 * Two selectors on the same store — verifies independent slice tracking.
 */
export function MultiSliceHarness() {
  const name = useStore(formStore, (s) => s.name);
  const submitted = useStore(formStore, (s) => s.submitted);

  return (
    <div>
      <span data-testid="name">{name}</span>
      <span data-testid="submitted">{String(submitted)}</span>
      <button
        onClick={() => {
          formStore.setField('name', 'Alice');
        }}
      >
        Set Name
      </button>
      <button
        onClick={() => {
          formStore.setField('email', 'alice@test.com');
        }}
      >
        Set Email
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
