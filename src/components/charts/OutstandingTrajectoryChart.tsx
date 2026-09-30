import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { formatCompactINR } from '../../domain/loan/money';

export interface TrajectoryDataPoint {
  date: string;
  period: number;
  baselineBalance: number; // in Rupees
  actualBalance?: number; // in Rupees
  scenarioBalance?: number; // in Rupees
}

interface OutstandingTrajectoryChartProps {
  data: TrajectoryDataPoint[];
  scenarioName?: string;
  className?: string;
}

export const OutstandingTrajectoryChart: React.FC<OutstandingTrajectoryChartProps> = ({
  data,
  scenarioName = 'Scenario',
  className,
}) => {
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Outstanding Principal Trajectory</CardTitle>
          <CardDescription>No schedule data available.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Downsample data if too dense (e.g. > 120 points) for chart performance
  const sampledData = React.useMemo(() => {
    if (data.length <= 60) return data;
    const step = Math.ceil(data.length / 60);
    return data.filter((_, idx) => idx % step === 0 || idx === data.length - 1);
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Outstanding Principal Trajectory</CardTitle>
            <CardDescription>
              Compares the baseline schedule against actual/projected payments and what-if scenarios
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sampledData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatCompactINR(val * 100)}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-popover p-2.5 text-xs shadow-md">
                        <div className="font-semibold text-foreground mb-1.5">{label}</div>
                        {payload.map((entry) => (
                          <div
                            key={entry.dataKey as string}
                            className="flex items-center justify-between space-x-4 py-0.5"
                          >
                            <span className="flex items-center text-muted-foreground">
                              <span
                                className="w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.name}:
                            </span>
                            <span className="font-medium text-foreground">
                              ₹{new Intl.NumberFormat('en-IN').format(entry.value as number)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="baselineBalance"
                name="Original Baseline"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="actualBalance"
                name="Actual / Projected"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
              />
              {data.some((d) => d.scenarioBalance !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="scenarioBalance"
                  name={scenarioName}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
