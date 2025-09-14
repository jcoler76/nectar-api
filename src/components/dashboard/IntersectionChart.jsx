import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import { ChartCardSkeleton } from './DashboardSkeleton';
import LazyActivityChart from './LazyActivityChart';

const IntersectionChart = ({ title, data, xKey, yKey, height = 320 }) => {
  const [ref, , hasBeenVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  return (
    <div ref={ref}>
      {hasBeenVisible ? (
        <Card gradient className="w-full">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="w-full overflow-x-auto">
              <LazyActivityChart data={data} xKey={xKey} yKey={yKey} height={height} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <ChartCardSkeleton />
      )}
    </div>
  );
};

export default IntersectionChart;
