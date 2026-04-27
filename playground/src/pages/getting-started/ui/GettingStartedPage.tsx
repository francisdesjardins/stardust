import { Grid } from '@mui/material';
import { ExampleCard } from '@/entities/example';
import { PageLayout } from '@/shared/ui/PageLayout/PageLayout';
import { AsyncStateExample } from '../examples/async-state';
import { CreateStoreExample } from '../examples/create-store';
import { DerivedStoreExample } from '../examples/derived-store';
import { WatchExample } from '../examples/watch';

export const GettingStartedPage = () => (
  <PageLayout
    title="Getting Started"
    description="Core store primitives — framework-agnostic, zero dependencies."
  >
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="createStore"
          description="Create a store with initial state and actions. Mutations are synchronous and immutable by default."
          codeKey="create-store"
        >
          <CreateStoreExample />
        </ExampleCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="createDerivedStore"
          description="Derive a read-only store from another store. The derived store updates whenever its source changes."
          codeKey="derived-store"
        >
          <DerivedStoreExample />
        </ExampleCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="createAsyncState"
          description="Model async operations with typed status: idle → pending → fulfilled | rejected."
          codeKey="async-state"
        >
          <AsyncStateExample />
        </ExampleCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <ExampleCard
          title="watch"
          description="Subscribe to store changes outside React. Returns an unsubscribe function."
          codeKey="watch"
        >
          <WatchExample />
        </ExampleCard>
      </Grid>
    </Grid>
  </PageLayout>
);
