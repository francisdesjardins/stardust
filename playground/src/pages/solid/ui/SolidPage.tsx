import { Alert, Grid } from '@mui/material';
import { ExampleCard } from '@/entities/example';
import { PageLayout } from '@/shared/ui/PageLayout/PageLayout';
import { SolidCounterWrapper } from '../examples/SolidCounterWrapper';

export const SolidPage = () => (
  <PageLayout
    title="SolidJS"
    description="@stardust/solid adapter — one store shared between React and a SolidJS island."
  >
    <Alert severity="info" sx={{ mb: 3 }}>
      SolidJS components live in <code>.solid.tsx</code> files, processed by{' '}
      <code>vite-plugin-solid</code>. React components use <code>@vitejs/plugin-react</code>. Both
      share the same store instance.
    </Alert>
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 8 }}>
        <ExampleCard
          title="Shared store — React + SolidJS"
          description="One createStore instance. React useStore and SolidJS useStore both subscribe to it. Click either button — both UIs update."
          codeKey="solid-react-bridge"
        >
          <SolidCounterWrapper />
        </ExampleCard>
      </Grid>
    </Grid>
  </PageLayout>
);
