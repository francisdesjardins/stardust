import { connectDebugLog, createStore } from '@stardust/core';

export function createResultStore(name = 'Result') {
  const store = createStore({ result: null as string | null }, ({ set }) => ({
    setResult(result: string | null) {
      set({ result });
    },
    
  }));
  connectDebugLog(store, { name: name.toLowerCase() });
  return store;
}
