import arrayMethodsSrc from '@/pages/utilities/examples/array-methods.tsx?raw';
import storeDispatchSrc from '@/pages/utilities/examples/store-dispatch.tsx?raw';
import produceSrc from '@/pages/utilities/examples/produce.tsx?raw';
import pathUtilsSrc from '@/pages/utilities/examples/path-utils.tsx?raw';
import safeAwaitSrc from '@/pages/utilities/examples/safe-await.tsx?raw';
import mutexSrc from '@/pages/utilities/examples/mutex.tsx?raw';
import singleFlightSrc from '@/pages/utilities/examples/single-flight.tsx?raw';
import debugLogSrc from '@/pages/utilities/examples/debug-log.tsx?raw';
import createStoreSrc from '@/pages/getting-started/examples/create-store.tsx?raw';
import derivedStoreSrc from '@/pages/getting-started/examples/derived-store.tsx?raw';
import asyncStateSrc from '@/pages/getting-started/examples/async-state.tsx?raw';
import watchSrc from '@/pages/getting-started/examples/watch.tsx?raw';
import useStoreSrc from '@/pages/react/examples/use-store.tsx?raw';
import useStoreSelectorSrc from '@/pages/react/examples/use-store-selector.tsx?raw';
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
  'use-store-selector': useStoreSelectorSrc,
  'use-suspense-store': useSuspenseStoreSrc,
  'create-store-context': createStoreContextSrc,

  // Utilities
  'array-methods': arrayMethodsSrc,
  'store-dispatch': storeDispatchSrc,
  produce: produceSrc,
  'path-utils': pathUtilsSrc,
  'safe-await': safeAwaitSrc,
  mutex: mutexSrc,
  'single-flight': singleFlightSrc,
  'debug-log': debugLogSrc,

  // SolidJS
  'solid-counter': solidCounterSrc,
  'solid-react-bridge': solidReactBridgeSrc,
  'shared-store': sharedStoreSrc,
};
