import { lazy, Suspense } from 'react';

import { Skeleton } from '../ui/skeleton';

const ActivityChart = lazy(() => import('./ActivityChart'));

const ChartSkeleton = () => <Skeleton className="h-80 w-full" />;

const LazyActivityChart = ({ ...chartProps }) => {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ActivityChart {...chartProps} />
    </Suspense>
  );
};

export default LazyActivityChart;
