import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const formatXAxisTick = value => {
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  } catch (_) {
    // ignore
  }
  return String(value);
};

const ActivityChart = ({
  data,
  xKey = 'time',
  yKey = 'calls',
  height = 320,
  showAverage = true,
}) => {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const computedHeight = isMobile ? Math.min(height, 280) : height;
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">No activity data to display</p>
      </div>
    );
  }

  const averageValue = showAverage
    ? Math.round(
        data.reduce((sum, item) => sum + (Number(item?.[yKey]) || 0), 0) / Math.max(1, data.length)
      )
    : null;

  return (
    <div className="w-full" style={{ height: computedHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="chartPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
          <XAxis
            dataKey={xKey}
            stroke="#0369a1"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatXAxisTick}
            minTickGap={24}
          />
          <YAxis
            stroke="#0369a1"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: '#075985',
            }}
            labelStyle={{
              color: '#075985',
              fontWeight: 500,
            }}
            formatter={value => [Number(value).toLocaleString(), yKey]}
            labelFormatter={label => formatXAxisTick(label)}
          />
          {showAverage && (
            <ReferenceLine
              y={averageValue}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
            />
          )}
          <Area
            type="monotone"
            dataKey={yKey}
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#chartPrimary)"
            strokeWidth={2}
            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff' }}
            dot={false}
          />
          <Brush
            height={24}
            stroke="hsl(var(--border))"
            travellerWidth={8}
            className="hidden sm:block"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityChart;
