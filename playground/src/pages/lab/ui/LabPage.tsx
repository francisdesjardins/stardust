import { PageLayout } from '@/shared/ui/PageLayout/PageLayout';
import { BenchmarkTable } from './BenchmarkTable';
import { StarfieldBanner } from './StarfieldBanner';

export const LabPage = () => (
  <PageLayout
    title="Lab"
    description="Benchmark results for @stardust/core — measured in Node.js with nanosecond precision."
  >
    <StarfieldBanner />
    <BenchmarkTable />
  </PageLayout>
);
