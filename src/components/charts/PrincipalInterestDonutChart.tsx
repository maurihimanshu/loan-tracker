import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { paiseToRupees } from '../../domain/loan/money';

export interface CompositionData {
  principalPaid: number; // in paise
  remainingPrincipal: number; // in paise
  interestPaid: number; // in paise
  remainingInterest: number; // in paise
}

interface PrincipalInterestDonutChartProps {
  data: CompositionData;
  className?: string;
}

export const PrincipalInterestDonutChart: React.FC<PrincipalInterestDonutChartProps> = ({
  data,
  className,
}) => {
  const chartData = [
    {
      name: 'Principal Paid',
      value: paiseToRupees(data.principalPaid),
      color: '#2563eb', // blue
    },
    {
      name: 'Remaining Principal',
      value: paiseToRupees(data.remainingPrincipal),
      color: '#93c5fd', // light blue
    },
    {
      name: 'Interest Paid',
      value: paiseToRupees(data.interestPaid),
      color: '#e11d48', // rose
    },
    {
      name: 'Remaining Interest',
      value: paiseToRupees(data.remainingInterest),
      color: '#fda4af', // light rose
    },
  ].filter((item) => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Principal vs Interest Composition</CardTitle>
        <CardDescription>
          Total commitment split into paid and remaining amounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full flex items-center justify-center pt-2">
          {total === 0 ? (
            <div className="text-sm text-muted-foreground">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0]!;
                      const val = item.value as number;
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2.5 text-xs shadow-md">
                          <div className="font-semibold text-foreground flex items-center space-x-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: item.payload?.color }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            ₹{new Intl.NumberFormat('en-IN').format(val)} ({pct}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
