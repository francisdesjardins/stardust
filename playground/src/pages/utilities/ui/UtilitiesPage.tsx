import { Divider, Grid, Typography } from '@mui/material';
import { ExampleCard } from '@/entities/example';
import { PageLayout } from '@/shared/ui/PageLayout/PageLayout';
import { ArrayMethodsExample } from '../examples/array-methods';
import { DebugLogExample } from '../examples/debug-log';
import { MutexExample } from '../examples/mutex';
import { PathUtilsExample } from '../examples/path-utils';
import { ProduceExample } from '../examples/produce';
import { SafeAwaitExample } from '../examples/safe-await';
import { SingleFlightExample } from '../examples/single-flight';
import { StoreDispatchExample } from '../examples/store-dispatch';

const SectionHeader = ({ label }: { label: string }) => (
  <Grid size={{ xs: 12 }}>
    <Divider sx={{ mb: 1 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
    </Divider>
  </Grid>
);

export const UtilitiesPage = () => (
  <PageLayout
    title="Utilities"
    description="Store helpers, mutation tools, async primitives, and concurrency utilities — all from @stardust/core."
  >
    <Grid container spacing={3}>
      <SectionHeader label="Store Patterns" />

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="createArrayMethods"
          description="Typed add / remove / set / move / upsert operations for an array field. Uses structural sharing — only the array spine is copied."
          codeKey="array-methods"
        >
          <ArrayMethodsExample />
        </ExampleCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="createStoreDispatch"
          description="Call store actions by string name — useful for event buses, middleware, and testing. Restrict the allowed set at the type level."
          codeKey="store-dispatch"
        >
          <StoreDispatchExample />
        </ExampleCard>
      </Grid>

      <SectionHeader label="Mutations" />

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="produce"
          description="Draft-based immutable update via structuredClone. Write mutations imperatively; the original snapshot is never touched."
          codeKey="produce"
        >
          <ProduceExample />
        </ExampleCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="Path utilities"
          description="parsePath, getAtPath, copyOnWritePath — low-level structural sharing. Only the mutation path spine is copied; sibling branches keep reference identity."
          codeKey="path-utils"
        >
          <PathUtilsExample />
        </ExampleCard>
      </Grid>

      <SectionHeader label="Async & Concurrency" />

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="safeAwait"
          description="Go-style [error, result] tuple. Avoids try/catch at every call site — error is null on success, result is null on failure."
          codeKey="safe-await"
        >
          <SafeAwaitExample />
        </ExampleCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="createMutex"
          description="Serializes concurrent async tasks through a promise gate. N calls run N times — one at a time. Errors never stall the queue."
          codeKey="mutex"
        >
          <MutexExample />
        </ExampleCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="createSingleFlight"
          description="Collapses N concurrent callers into one execution. While a task is in-flight, every subsequent call shares the same promise."
          codeKey="single-flight"
        >
          <SingleFlightExample />
        </ExampleCard>
      </Grid>

      <SectionHeader label="Debug" />

      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="connectDebugLog"
          description="Attach a diff logger to any store. Pass onLog for a custom handler — here it drives a live diff panel without the DevTools console."
          codeKey="debug-log"
        >
          <DebugLogExample />
        </ExampleCard>
      </Grid>
    </Grid>
  </PageLayout>
);
