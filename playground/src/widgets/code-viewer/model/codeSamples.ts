import createStoreSrc from '@/pages/getting-started/examples/create-store.tsx?raw';
import derivedStoreSrc from '@/pages/getting-started/examples/derived-store.tsx?raw';
import asyncStateSrc from '@/pages/getting-started/examples/async-state.tsx?raw';
import watchSrc from '@/pages/getting-started/examples/watch.tsx?raw';
import useStoreSrc from '@/pages/react/examples/use-store.tsx?raw';
import useSuspenseStoreSrc from '@/pages/react/examples/use-suspense-store.tsx?raw';
import createStoreContextSrc from '@/pages/react/examples/create-store-context.tsx?raw';
import solidCounterSrc from '@/pages/solid/examples/solid-counter.solid.tsx?raw';
import solidReactBridgeSrc from '@/pages/solid/examples/SolidCounterWrapper.tsx?raw';
import sharedStoreSrc from '@/pages/solid/examples/shared-store.tsx?raw';

export const codeSamples: Record<string, string> = {
  // Getting Started
  'create-store': createStoreSrc,
  'derived-store': derivedStoreSrc,
  'async-state': asyncStateSrc,
  watch: watchSrc,

  // React
  'use-store': useStoreSrc,
  'use-suspense-store': useSuspenseStoreSrc,
  'create-store-context': createStoreContextSrc,

  // SolidJS
  'solid-counter': solidCounterSrc,
  'solid-react-bridge': solidReactBridgeSrc,
  'shared-store': sharedStoreSrc,
};
