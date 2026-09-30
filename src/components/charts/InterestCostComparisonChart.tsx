import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { formatCompactINR, paiseToRupees } from '../../domain/loan/money';

export interface InterestComparisonItem {
  planName: string;
  interest: number; // in Rupees
  color: string;
}

interface InterestCostComparisonChartProps {
  originalInterest: number; // in paise
  projectedInterest: number; // in paise
  scenarioInterest?: number; // in paise
  scenarioName?: string;
  className?: string;
}

export const InterestCostComparisonChart: React.FC<
  InterestCostComparisonChartProps
> = ({
  originalInterest,
  projectedInterest,
  scenarioInterest,
  scenarioName = 'Selected Scenario',
  className,
}) => {
  const data: InterestComparisonItem[] = [
    {
      planName: 'Original Baseline',
      interest: paiseToRupees(originalInterest),
      color: '#94a3b8',
    },
    {
      planName: 'Current Plan',
      interest: paiseToRupees(projectedInterest),
      color: '#059669', // Emerald/green savings
    },
  ];

  if (scenarioInterest !== undefined) {
    data.push({
      planName: scenarioName,
      interest: paiseToRupees(scenarioInterest),
      color: '#f59e0b', // Amber
    });
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Total Interest Cost Comparison</CardTitle>
        <CardDescription>
          Compare lifetime interest payable across repayment strategies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="planName"
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
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0]!;
                    const val = item.value as number;
                    return (
                      <div className="rounded-lg border border-border bg-popover p-2.5 text-xs shadow-md">
                        <div className="font-semibold text-foreground">
                          {item.payload?.planName}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          Total Interest: ₹{new Intl.NumberFormat('en-IN').format(val)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="interest" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {data.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

