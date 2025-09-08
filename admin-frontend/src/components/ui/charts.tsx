import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './card'

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
]

interface ChartWrapperProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

const ChartWrapper = ({ title, description, children, className = '' }: ChartWrapperProps) => (
  <Card className={className}>
    {(title || description) && (
      <CardHeader>
        {title && <CardTitle>{title}</CardTitle>}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
    )}
    <CardContent>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
)

interface LineChartComponentProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  title?: string
  description?: string
  color?: string
  className?: string
}

export const LineChartComponent = ({
  data,
  dataKey,
  xAxisKey,
  title,
  description,
  color = CHART_COLORS[0],
  className
}: LineChartComponentProps) => (
  <ChartWrapper title={title} description={description} className={className}>
    <LineChart data={data}>
      <XAxis 
        dataKey={xAxisKey}
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
      <YAxis
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px'
        }}
      />
      <Line
        type="monotone"
        dataKey={dataKey}
        stroke={color}
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  </ChartWrapper>
)

interface BarChartComponentProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  title?: string
  description?: string
  color?: string
  className?: string
}

export const BarChartComponent = ({
  data,
  dataKey,
  xAxisKey,
  title,
  description,
  color = CHART_COLORS[1],
  className
}: BarChartComponentProps) => (
  <ChartWrapper title={title} description={description} className={className}>
    <BarChart data={data}>
      <XAxis
        dataKey={xAxisKey}
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
      <YAxis
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px'
        }}
      />
      <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ChartWrapper>
)

interface AreaChartComponentProps {
  data: any[]
  dataKey: string
  xAxisKey: string
  title?: string
  description?: string
  color?: string
  className?: string
}

export const AreaChartComponent = ({
  data,
  dataKey,
  xAxisKey,
  title,
  description,
  color = CHART_COLORS[2],
  className
}: AreaChartComponentProps) => (
  <ChartWrapper title={title} description={description} className={className}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <XAxis
        dataKey={xAxisKey}
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
      <YAxis
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
        tickLine={false}
        axisLine={false}
      />
      <Tooltip
        contentStyle={{
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px'
        }}
      />
      <Area
        type="monotone"
        dataKey={dataKey}
        stroke={color}
        fill="url(#area-gradient)"
        strokeWidth={2}
      />
    </AreaChart>
  </ChartWrapper>
)

interface PieChartComponentProps {
  data: any[]
  dataKey: string
  nameKey: string
  title?: string
  description?: string
  colors?: string[]
  className?: string
}

export const PieChartComponent = ({
  data,
  dataKey,
  nameKey,
  title,
  description,
  colors = CHART_COLORS,
  className
}: PieChartComponentProps) => (
  <ChartWrapper title={title} description={description} className={className}>
    <PieChart>
      <Pie
        data={data}
        dataKey={dataKey}
        nameKey={nameKey}
        cx="50%"
        cy="50%"
        outerRadius={80}
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px'
        }}
      />
    </PieChart>
  </ChartWrapper>
)

interface DonutChartComponentProps {
  data: any[]
  dataKey: string
  nameKey: string
  title?: string
  description?: string
  colors?: string[]
  className?: string
}

export const DonutChartComponent = ({
  data,
  dataKey,
  nameKey,
  title,
  description,
  colors = CHART_COLORS,
  className
}: DonutChartComponentProps) => (
  <ChartWrapper title={title} description={description} className={className}>
    <PieChart>
      <Pie
        data={data}
        dataKey={dataKey}
        nameKey={nameKey}
        cx="50%"
        cy="50%"
        innerRadius={40}
        outerRadius={80}
      >
        {data.map((_, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={{
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px'
        }}
      />
    </PieChart>
  </ChartWrapper>
)