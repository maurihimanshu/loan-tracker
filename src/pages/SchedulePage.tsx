import React from 'react';
import { useAppSelector } from '../app/hooks';
import { selectActiveLoan, selectActiveSchedule, selectActiveKpis } from '../app/selectors';
import { AmortizationTable } from '../components/tables/AmortizationTable';
import { EmptyState } from '../components/ui/EmptyState';
import { formatINR } from '../domain/loan/money';
import { Table as TableIcon, Sparkles } from 'lucide-react';

export const SchedulePage: React.FC = () => {
  const activeLoan = useAppSelector(selectActiveLoan);
  const schedule = useAppSelector(selectActiveSchedule);
  const kpis = useAppSelector(selectActiveKpis);

  if (!activeLoan) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={<TableIcon className="w-8 h-8" />}
          title="No loan selected"
          description="Create or select a loan to inspect the amortization schedule."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in">
      <div className="pb-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Amortization & Payment Schedule
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed period-by-period breakdown of principal repayment, interest accrual, prepayments, and closing balances for{' '}
            <strong>{activeLoan.name}</strong>
          </p>
        </div>

        {kpis && kpis.realizedInterestSaving > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              {formatINR(kpis.realizedInterestSaving)} saved till today ({kpis.realizedInterestSavingPercentage}%)
            </span>
          </div>
        )}
      </div>

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-card border border-border rounded-lg text-xs">
            <span className="text-muted-foreground block text-[11px]">Original Baseline Interest</span>
            <span className="text-muted-foreground block text-[11px]">Baseline Interest To Date</span>
            <span className="font-bold text-foreground text-sm">
              {formatINR(kpis.baselineInterestToDate)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Without part-payments till today
              Expected without prepayments
            </span>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg text-xs">
            <span className="text-muted-foreground block text-[11px]">Actual Interest Paid</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
              {formatINR(kpis.actualInterestPaid)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Debited across completed EMIs
            </span>
          </div>

          <div className="p-3 bg-card border border-emerald-500/30 bg-emerald-500/5 rounded-lg text-xs">
            <span className="text-emerald-800 dark:text-emerald-300 block text-[11px] font-medium">Interest Saved Till Today</span>
            <span className="text-emerald-800 dark:text-emerald-300 block text-[11px] font-medium">Saved in Debited EMIs</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatINR(kpis.realizedInterestSaving)}
              </span>
              {kpis.realizedInterestSavingPercentage > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {kpis.realizedInterestSavingPercentage}%
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {kpis.realizedInterestSaving > 0 ? 'Retained cash savings' : 'Matches baseline schedule'}
              {kpis.realizedInterestSaving > 0 ? 'Monthly cash retained' : 'Matches baseline schedule'}
            </span>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg text-xs">
            <span className="text-muted-foreground block text-[11px]">Projected Total Lifetime Savings</span>
            <span className="text-muted-foreground block text-[11px]">Total Interest Saved on Loan</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatINR(kpis.projectedInterestSaving)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {kpis.projectedTenureSavedMonths > 0 ? `${kpis.projectedTenureSavedMonths} months early payoff` : 'Full loan duration'}
              On original {formatINR(kpis.originalTotalInterest)} total interest
            </span>
          </div>
        </div>
      )}

      <AmortizationTable schedule={schedule} loanName={activeLoan.name} />
    </div>
  );
};
