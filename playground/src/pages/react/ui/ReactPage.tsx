import { Grid } from '@mui/material';
import { ExampleCard } from '@/entities/example';
import { PageLayout } from '@/shared/ui/PageLayout/PageLayout';
import { CreateStoreContextExample } from '../examples/create-store-context';
import { UseSuspenseStoreExample } from '../examples/use-suspense-store';
import { UseStoreExample } from '../examples/use-store';

export const ReactPage = () => (
  <PageLayout
    title="React"
    description="React hooks for @stardust/core — concurrent-safe via useSyncExternalStore."
  >
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="useStore"
          description="Subscribe to a store in React. Accepts an optional selector to limit re-renders."
          codeKey="use-store"
        >
          <UseStoreExample />
        </ExampleCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="useSuspenseStore"
          description="Suspend until async state is fulfilled. Works with React Suspense boundaries."
          codeKey="use-suspense-store"
        >
          <UseSuspenseStoreExample />
        </ExampleCard>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <ExampleCard
          title="createStoreContext"
          description="Scoped store per React subtree — multiple independent instances via context, no prop drilling."
          codeKey="create-store-context"
        >
          <CreateStoreContextExample />
        </ExampleCard>
      </Grid>
    </Grid>
  </PageLayout>
);
