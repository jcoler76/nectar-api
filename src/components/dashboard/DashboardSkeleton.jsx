import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export const MetricCardSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4" />
        <div className="flex-1">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const StatisticsCardSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ChartCardSkeleton = () => (
  <Card className="w-full">
    <CardHeader className="pb-3 sm:pb-6">
      <Skeleton className="h-5 w-24" />
    </CardHeader>
    <CardContent className="p-3 sm:p-6">
      <div className="w-full">
        <Skeleton className="h-80 w-full" />
      </div>
    </CardContent>
  </Card>
);

export const ServiceHealthSkeleton = () => (
  <Card className="w-full">
    <CardHeader className="pb-3 sm:pb-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-28" />
      </div>
    </CardHeader>
    <CardContent className="p-3 sm:p-6">
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
