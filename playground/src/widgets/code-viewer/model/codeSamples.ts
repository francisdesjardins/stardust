// ── Benchmark definitions (one file per group) ──────────────────────────────
import benchBatchSrc from 'virtual:bench-source/batch.ts';
import benchCopyOnWritePathSrc from 'virtual:bench-source/copy-on-write-path.ts';
import benchCreateArrayMethodsSrc from 'virtual:bench-source/create-array-methods.ts';
import benchCreateDerivedStoreSrc from 'virtual:bench-source/create-derived-store.ts';
import benchCreateStoreDispatchSrc from 'virtual:bench-source/create-store-dispatch.ts';
import benchCreateStoreGetSetSrc from 'virtual:bench-source/create-store-get-set.ts';
import benchCreateStoreSubscriptionSrc from 'virtual:bench-source/create-store-subscription.ts';
import benchCreateStoreUpdateSrc from 'virtual:bench-source/create-store-update.ts';
import benchEndToEndSrc from 'virtual:bench-source/end-to-end.ts';
import benchPathUtilitiesSrc from 'virtual:bench-source/path-utilities.ts';
import benchProduceSrc from 'virtual:bench-source/produce.ts';
import benchShallowEqualSrc from 'virtual:bench-source/shallow-equal.ts';
import benchStoreGetSetByPathSrc from 'virtual:bench-source/store-get-set-by-path.ts';
import benchStructuredCloneBaselineSrc from 'virtual:bench-source/structured-clone-baseline.ts';
import benchWatchSrc from 'virtual:bench-source/watch.ts';

// ── Playground examples ──────────────────────────────────────────────────────
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

  // Benchmarks
  'bench-create-store-subscription': benchCreateStoreSubscriptionSrc,
  'bench-create-store-get-set': benchCreateStoreGetSetSrc,
  'bench-create-store-update': benchCreateStoreUpdateSrc,
  'bench-path-utilities': benchPathUtilitiesSrc,
  'bench-store-get-set-by-path': benchStoreGetSetByPathSrc,
  'bench-produce': benchProduceSrc,
  'bench-create-array-methods': benchCreateArrayMethodsSrc,
  'bench-create-derived-store': benchCreateDerivedStoreSrc,
  'bench-end-to-end': benchEndToEndSrc,
  'bench-structured-clone-baseline': benchStructuredCloneBaselineSrc,
  'bench-copy-on-write-path': benchCopyOnWritePathSrc,
  'bench-batch': benchBatchSrc,
  'bench-create-store-dispatch': benchCreateStoreDispatchSrc,
  'bench-shallow-equal': benchShallowEqualSrc,
  'bench-watch': benchWatchSrc,
};
