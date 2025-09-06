import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const TrendBadge = ({ trendPercent }) => {
  if (trendPercent === undefined || trendPercent === null || isNaN(trendPercent)) {
    return null;
  }
  const isUp = trendPercent >= 0;
  const colorClass = isUp ? 'text-green-600' : 'text-red-600';
  const BgClass = isUp ? 'bg-green-50' : 'bg-red-50';
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${BgClass} ${colorClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(trendPercent).toFixed(1)}%
    </span>
  );
};

const Sparkline = ({ data = [], dataKey = 'value', color = 'hsl(var(--primary))' }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill="url(#spark)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const KpiCard = ({ title, value, icon: Icon, trendPercent, sparklineData, sparklineKey }) => {
  return (
    <Card gradient className="relative overflow-hidden card-interactive hover-glow group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <TrendBadge trendPercent={trendPercent} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 text-primary" /> : null}
          <div className="text-3xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>
        {sparklineData && sparklineData.length > 1 ? (
          <div className="mt-3">
            <Sparkline data={sparklineData} dataKey={sparklineKey} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
