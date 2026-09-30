import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { formatCompactINR, paiseToRupees } from '../../domain/loan/money';
import { AmortizationRow } from '../../domain/loan/types';
import { formatMonthYear } from '../../domain/loan/dates';

interface MonthlyCompositionChartProps {
  schedule: AmortizationRow[];
  maxPeriods?: number;
  className?: string;
}

export const MonthlyCompositionChart: React.FC<MonthlyCompositionChartProps> = ({
  schedule,
  maxPeriods = 36,
  className,
}) => {
  const chartData = React.useMemo(() => {
    // Take first `maxPeriods` regular rows for clear monthly inspection
    const regularRows = schedule.filter((r) => r.periodNumber > 0).slice(0, maxPeriods);

    return regularRows.map((r) => ({
      date: formatMonthYear(r.date),
      period: r.periodNumber,
      principal: paiseToRupees(r.scheduledPrincipal),
      interest: paiseToRupees(r.interest),
      partPayment: paiseToRupees(r.partPayment),
      total: paiseToRupees(r.totalPayment),
    }));
  }, [schedule, maxPeriods]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Monthly Payment Composition</CardTitle>
        <CardDescription>
          Principal, interest, and part-payment breakdown across installments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={10}
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
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Bar
                dataKey="principal"
                name="Principal Component"
                stackId="a"
                fill="#2563eb"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="interest"
                name="Interest Component"
                stackId="a"
                fill="#e11d48"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="partPayment"
                name="Part Payment"
                stackId="a"
                fill="#059669"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

