import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  selectActiveLoan,
  selectActiveCalculation,
  selectActiveKpis,
  selectActiveSchedule,
  selectActiveBaselineSchedule,
  selectUpcomingPayments,
  selectScenarioResults,
  selectSelectedScenarioResult,
  selectAggregateKpis,
  selectLoans,
} from '../app/selectors';
import { openLoanSetup, setActiveTab } from '../features/ui/uiSlice';
import { setSelectedScenarioId } from '../features/scenarios/scenarioSlice';
import { addEvent } from '../features/payments/paymentSlice';
import { MetricCard } from '../components/ui/MetricCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { OutstandingTrajectoryChart, TrajectoryDataPoint } from '../components/charts/OutstandingTrajectoryChart';
import { PrincipalInterestDonutChart } from '../components/charts/PrincipalInterestDonutChart';
import { InterestCostComparisonChart } from '../components/charts/InterestCostComparisonChart';
import { MonthlyCompositionChart } from '../components/charts/MonthlyCompositionChart';
import { formatINR, paiseToRupees } from '../domain/loan/money';
import { formatDisplayDate, formatMonthYear } from '../domain/loan/dates';
import {
  Building2,
  Calendar,
  CreditCard,
  TrendingDown,
  Clock,
  PiggyBank,
  ArrowRight,
  Plus,
  Layers,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const loans = useAppSelector(selectLoans);
  const activeLoan = useAppSelector(selectActiveLoan);
  const calculation = useAppSelector(selectActiveCalculation);
  const kpis = useAppSelector(selectActiveKpis);
  const schedule = useAppSelector(selectActiveSchedule);
  const baselineSchedule = useAppSelector(selectActiveBaselineSchedule);
  const upcomingPayments = useAppSelector(selectUpcomingPayments);
  const scenarios = useAppSelector(selectScenarioResults);
  const selectedScenario = useAppSelector(selectSelectedScenarioResult);
  const aggregateKpis = useAppSelector(selectAggregateKpis);

  const [showPortfolio, setShowPortfolio] = useState(false);

  // If no loans exist, render empty state (Section 60)
  if (!activeLoan || !calculation || !kpis) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="No loan tracked yet"
          description="Create your first loan or import an existing loan tracking CSV to begin tracking repayments and prepayment analytics."
          actionLabel="Create First Loan"
          onAction={() => dispatch(openLoanSetup(null))}
        />
      </div>
    );
  }

  // Prepare Trajectory Data combining baseline, actual/projected, and scenario
  const trajectoryData: TrajectoryDataPoint[] = [];
  const maxPeriods = Math.max(baselineSchedule.length, schedule.length);

  for (let i = 0; i < maxPeriods; i++) {
    const baseRow = baselineSchedule[i];
    const schedRow = schedule[i];
    const scenRow = selectedScenario?.schedule[i];

    if (baseRow || schedRow || scenRow) {
      const date = schedRow?.date ?? baseRow?.date ?? scenRow?.date ?? `P${i}`;
      trajectoryData.push({
        date: formatMonthYear(date),
        period: i + 1,
        baselineBalance: baseRow ? paiseToRupees(baseRow.closingBalance) : 0,
        actualBalance: schedRow ? paiseToRupees(schedRow.closingBalance) : 0,
        scenarioBalance: scenRow ? paiseToRupees(scenRow.closingBalance) : undefined,
      });
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in">
      {/* Top Banner: Loan Summary & Portfolio Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {showPortfolio ? 'Portfolio Overview' : activeLoan.name}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {activeLoan.repaymentMode === 'REDUCE_TENURE' ? 'Reduce Tenure' : 'Reduce EMI'}
            </span>
            {activeLoan.status === 'CLOSED' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                Closed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {activeLoan.annualInterestRate}% p.a. • Started {formatDisplayDate(activeLoan.startDate)} • First EMI {formatDisplayDate(activeLoan.firstEmiDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {loans.length > 1 && (
            <Button
              variant={showPortfolio ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowPortfolio(!showPortfolio)}
              className="h-8 text-xs"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              {showPortfolio ? 'Single Loan View' : 'All Loans Portfolio'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(setActiveTab('partPayments'))}
            className="h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Part Payment
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(setActiveTab('scenarios'))}
            className="h-8 text-xs"
          >
            Simulate Scenario
          </Button>
        </div>
      </div>

      {/* Aggregate Portfolio Metrics (Section 77) if enabled */}
      {showPortfolio && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-primary">
            <span>Portfolio Across All {aggregateKpis.loanCount} Loans</span>
            <span>Consolidated Financial Position</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Outstanding</span>
              <span className="text-base font-bold text-foreground">
                {formatINR(aggregateKpis.totalOutstandingPrincipal)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Monthly EMI</span>
              <span className="text-base font-bold text-foreground">
                {formatINR(aggregateKpis.totalCurrentEmi)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Principal Paid</span>
              <span className="text-base font-semibold text-blue-600 dark:text-blue-400">
                {formatINR(aggregateKpis.totalPrincipalPaid)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Realized Saved Till Today</span>
              <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                {formatINR(aggregateKpis.totalRealizedInterestSaving)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Total Projected Savings</span>
              <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                {formatINR(aggregateKpis.totalProjectedInterestSaving)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Broken Period Pre-EMI Interest Pending Notification Banner */}
      {schedule[0]?.periodNumber === 0 && schedule[0].status !== 'ACTUAL' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs gap-3">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-foreground">
                Broken-Period Interest Pending: {formatINR(schedule[0].interest)}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Pre-EMI interest accrued before your regular EMI starts. If you have already paid this (e.g. ₹4,027), mark it as paid to track actual interest.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const bpRow = schedule[0];
              if (!bpRow) return;
              dispatch(
                addEvent({
                  id: `bp-${Date.now()}`,
                  loanId: activeLoan.id,
                  date: bpRow.date,
                  type: 'BROKEN_PERIOD_PAYMENT',
                  status: 'ACTUAL',
                  amount: bpRow.interest,
                  interestComponent: bpRow.interest,
                  principalComponent: 0,
                  source: 'USER_ENTERED',
                  notes: 'Broken period interest paid before first EMI',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              );
            }}
            className="text-xs shrink-0 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Mark as Paid ({formatINR(schedule[0]?.interest ?? 0)})
          </Button>
        </div>
      )}

      {/* Primary KPI Cards Grid (Section 21) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Outstanding Principal"
          value={formatINR(kpis.currentOutstandingPrincipal)}
          secondary={`Original: ${formatINR(kpis.originalPrincipal)}`}
          tooltip="Remaining principal balance requiring repayment"
          icon={<CreditCard className="w-4 h-4" />}
        />

        <MetricCard
          title="Current Monthly EMI"
          value={formatINR(kpis.currentEmi)}
          secondary={`${kpis.remainingTenureMonths} installments left`}
          tooltip="Equated monthly installment due each cycle"
          icon={<Calendar className="w-4 h-4" />}
        />

        <MetricCard
          title="Projected Interest Saved"
          value={formatINR(kpis.projectedInterestSaving)}
          secondary={kpis.projectedTenureSavedMonths > 0 ? `${kpis.projectedTenureSavedMonths} months saved` : 'On track with schedule'}
          badge={{ text: 'Projected', variant: 'success' }}
          tooltip="Total lifetime interest saved compared to original schedule without prepayments"
          icon={<PiggyBank className="w-4 h-4" />}
        />

        <MetricCard
          title="Projected Closure Date"
          value={formatDisplayDate(kpis.projectedMaturityDate)}
          secondary={`Original: ${formatDisplayDate(kpis.originalMaturityDate)}`}
          tooltip="Projected date when outstanding principal reaches exactly zero"
          icon={<Clock className="w-4 h-4" />}
        />

        <MetricCard
          title="Total Part-Payments"
          value={formatINR(kpis.actualPartPaymentsPaid + kpis.projectedTotalPartPayments)}
          secondary={`Actual Paid: ${formatINR(kpis.actualPartPaymentsPaid)}`}
          tooltip="Sum of extra prepayments applied towards reducing loan balance"
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <span className="text-muted-foreground block text-[11px]">Principal Paid To Date</span>
          <span className="font-bold text-foreground text-sm">
            {formatINR(kpis.actualPrincipalPaid)}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            vs. {formatINR(kpis.baselinePrincipalToDate)} baseline
          </span>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <span className="text-muted-foreground block text-[11px]">Interest Paid To Date</span>
          <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
            {formatINR(kpis.actualInterestPaid)}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            vs. {formatINR(kpis.baselineInterestToDate)} expected
          </span>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <span className="text-muted-foreground block text-[11px]">Remaining Interest</span>
          <span className="font-bold text-foreground text-sm">
            {formatINR(kpis.remainingInterest)}
          </span>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            Across remaining {kpis.remainingTenureMonths} installments
          </span>
        </div>
        <div className="p-3 bg-card border border-border rounded-lg text-xs">
          <span className="text-muted-foreground block text-[11px]">Interest Saved Till Today</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatINR(kpis.savingsFromActualPrepayments > 0 ? kpis.savingsFromActualPrepayments : kpis.realizedInterestSaving)}
            </span>
            {kpis.savingsFromActualPrepayments > 0 ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {(((kpis.savingsFromActualPrepayments) / (kpis.originalTotalInterest || 1)) * 100).toFixed(1)}% of loan
              </span>
            ) : kpis.realizedInterestSavingPercentage > 0 ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {kpis.realizedInterestSavingPercentage}% saved
              </span>
            ) : null}
          </div>
          <span className="text-[10px] text-muted-foreground block mt-0.5">
            {kpis.savingsFromActualPrepayments > 0
              ? `Saved on loan (${formatINR(kpis.realizedInterestSaving)} in debited EMIs)`
              : 'No prepayments made yet'}
          </span>
        </div>
      </div>

      {/* Dedicated Comprehensive Interest Saved on Original Interest Section */}
      <Card className="border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.04] via-background to-background">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  Interest Saved on Original Loan Interest
                  <span className="text-xs font-normal text-muted-foreground hidden sm:inline">
                    (vs. Standard EMI without Part-Payments)
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clear side-by-side comparison of original baseline loan interest, savings locked in till today, and statement cash savings
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {formatINR(kpis.savingsFromActualPrepayments > 0 ? kpis.savingsFromActualPrepayments : kpis.projectedInterestSaving)} Saved on Original Loan
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {/* Tier 1: Original Loan Total Interest Comparison */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              1. Total Loan Interest (Full Tenure Impact)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-border bg-card/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Original Total Loan Interest</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    Pure Standard EMI
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-foreground">
                  {formatINR(kpis.originalTotalInterest)}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Total interest payable across full {activeLoan.originalTenureMonths} months tenure if no part-payments are made.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-card/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Revised Total Interest</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                    With Prepayments
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(kpis.projectedTotalInterest)}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Actual total interest payable factoring in your part-payments. Loan closes on {formatDisplayDate(kpis.projectedMaturityDate)}.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Total Interest Saved on Loan</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    {((kpis.projectedInterestSaving / (kpis.originalTotalInterest || 1)) * 100).toFixed(1)}% Saved
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(kpis.projectedInterestSaving)}
                </div>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed">
                  Lifetime interest permanently eliminated. Saves {kpis.projectedTenureSavedMonths > 0 ? `${kpis.projectedTenureSavedMonths} monthly EMIs` : 'interest'}!
                </p>
              </div>
            </div>
          </div>

          {/* Tier 2: Prepayments Paid Till Today & Statement Cash Realized */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
              2. Progress Achieved Till Today
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card/50 space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">Part-Payments Paid Till Today</span>
                <div className="text-base font-bold text-foreground">
                  {formatINR(kpis.actualPartPaymentsPaid)}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  Extra principal prepayments completed so far
                </span>
              </div>

              <div className="p-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 space-y-1">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-medium">
                  Loan Interest Saved by Prepayments to Date
                </span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(kpis.savingsFromActualPrepayments)}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {kpis.tenureSavedFromActualPrepaymentsMonths > 0
                    ? `Eliminates ${kpis.tenureSavedFromActualPrepaymentsMonths} months off original loan`
                    : 'Permanently eliminates loan interest'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card/50 space-y-1">
                <span className="text-[11px] text-muted-foreground block font-medium">
                  Cash Interest Saved in Statements to Date
                </span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(kpis.realizedInterestSaving)}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {kpis.realizedInterestSaving > 0
                    ? `${formatINR(kpis.actualInterestPaid)} paid vs. ${formatINR(kpis.baselineInterestToDate)} expected`
                    : kpis.elapsedPeriodsCount === 0
                      ? 'Pre-EMI period (No regular EMIs debited yet)'
                      : 'Matches baseline schedule so far'}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Breakdown Bar of Original Loan Interest */}
          {kpis.originalTotalInterest > 0 && (
            <div className="p-3 rounded-lg border border-border bg-card/50 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-foreground">Original Loan Total Interest Breakdown</span>
                <span className="text-muted-foreground text-[11px]">
                  Original Total Interest: {formatINR(kpis.originalTotalInterest)}
                </span>
              </div>

              <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-rose-500/80 hover:bg-rose-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (kpis.projectedTotalInterest / (kpis.originalTotalInterest || 1)) * 100))}%`,
                  }}
                  title={`Revised Total Interest: ${formatINR(kpis.projectedTotalInterest)}`}
                />
                <div
                  className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, (kpis.projectedInterestSaving / (kpis.originalTotalInterest || 1)) * 100))}%`,
                  }}
                  title={`Total Interest Saved: ${formatINR(kpis.projectedInterestSaving)}`}
                />
              </div>

              <div className="flex flex-wrap justify-between items-center text-[11px] gap-2 pt-0.5">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 inline-block" />
                  <span className="text-muted-foreground">
                    Revised Interest to Pay: <strong className="text-foreground">{formatINR(kpis.projectedTotalInterest)}</strong> (
                    {(Math.max(0, (kpis.projectedTotalInterest / (kpis.originalTotalInterest || 1)) * 100)).toFixed(1)}%)
                  </span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                    Total Interest Saved on Loan: <strong>{formatINR(kpis.projectedInterestSaving)}</strong> (
                    {(Math.max(0, (kpis.projectedInterestSaving / (kpis.originalTotalInterest || 1)) * 100)).toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Contextual Guidance Explaining Mechanics */}
          <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="leading-relaxed">
                {kpis.actualPartPaymentsPaid > 0 ? (
                  <>
                    <strong>How your savings work:</strong> By paying{' '}
                    <strong className="text-foreground">{formatINR(kpis.actualPartPaymentsPaid)}</strong> in prepayments to date, you
                    reduced your principal balance earlier than scheduled. This has permanently eliminated{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatINR(kpis.savingsFromActualPrepayments)}
                    </strong>{' '}
                    from your original loan's total interest of{' '}
                    <strong className="text-foreground">{formatINR(kpis.originalTotalInterest)}</strong>. In completed monthly installments, you have already kept{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatINR(kpis.realizedInterestSaving)}
                    </strong>{' '}
                    in your bank account as cash savings!
                  </>
                ) : kpis.elapsedPeriodsCount === 0 ? (
                  <>
                    <strong>Pre-EMI / Initial loan period:</strong> Your loan has started, and your first regular monthly EMI begins on{' '}
                    <strong className="text-foreground">{formatDisplayDate(activeLoan.firstEmiDate)}</strong>. If you have pre-EMI broken-period interest
                    or make early prepayments, they directly reduce your starting balance, immediately cutting every future monthly interest charge!
                  </>
                ) : (
                  <>
                    <strong>Standard regular schedule active:</strong> Your interest paid to date matches the original amortization schedule of{' '}
                    <strong className="text-foreground">{formatINR(kpis.baselineInterestToDate)}</strong>. Prepaying even a small amount directly
                    cuts your principal balance, permanently lowering all future monthly interest charges and unlocking significant lifetime interest savings!
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Scenario Selector for Chart comparisons */}
      {scenarios.length > 0 && (
        <div className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-border bg-card text-xs gap-2">
          <span className="font-medium text-foreground">
            Comparing Active Scenario in Charts:
          </span>
          <div className="flex items-center space-x-2">
            <select
              value={selectedScenario?.scenarioId ?? ''}
              onChange={(e) => dispatch(setSelectedScenarioId(e.target.value))}
              className="h-8 rounded border border-input bg-background px-2.5 text-xs font-medium focus:outline-none"
            >
              {scenarios.map((sc) => (
                <option key={sc.scenarioId} value={sc.scenarioId}>
                  {sc.scenarioName} (+{formatINR(sc.interestSavedVsBaseline)} saved)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Analytical Charts Grid (Section 22) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OutstandingTrajectoryChart
          data={trajectoryData}
          scenarioName={selectedScenario?.scenarioName}
        />
        <PrincipalInterestDonutChart
          data={{
            principalPaid: kpis.actualPrincipalPaid,
            remainingPrincipal: kpis.currentOutstandingPrincipal,
            interestPaid: kpis.actualInterestPaid,
            remainingInterest: kpis.remainingInterest,
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InterestCostComparisonChart
          originalInterest={kpis.originalTotalInterest}
          projectedInterest={kpis.projectedTotalInterest}
          scenarioInterest={selectedScenario?.projectedInterest}
          scenarioName={selectedScenario?.scenarioName}
        />
        <MonthlyCompositionChart schedule={schedule} maxPeriods={24} />
      </div>

      {/* Upcoming Payments & Quick Actions Section (Section 63) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upcoming Payments Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Scheduled Repayments</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(setActiveTab('schedule'))}
                className="h-7 text-xs text-primary"
              >
                View Full Schedule
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {upcomingPayments.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No upcoming installments. The loan is completed or closed.
              </div>
            ) : (
              upcomingPayments.map((payment) => (
                <div
                  key={payment.periodNumber}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-semibold text-xs shrink-0 ${
                        payment.periodNumber === 0
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {payment.periodNumber === 0 ? 'BP' : `#${payment.periodNumber}`}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                        <span>{formatDisplayDate(payment.date)}</span>
                        {payment.periodNumber === 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Broken-Period
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {payment.periodNumber === 0 ? 'Pre-EMI Interest: ' : 'EMI: '}
                        {formatINR(payment.scheduledEmi)}
                        {payment.partPayment > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                            + {formatINR(payment.partPayment)} Part-Payment
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">
                        {formatINR(payment.totalPayment)}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Closing: {formatINR(payment.closingBalance)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        dispatch(
                          addEvent({
                            id: `${payment.periodNumber === 0 ? 'bp' : 'emi'}-${Date.now()}`,
                            loanId: activeLoan.id,
                            date: payment.date,
                            type: payment.periodNumber === 0 ? 'BROKEN_PERIOD_PAYMENT' : 'EMI',
                            status: 'ACTUAL',
                            amount: payment.totalPayment,
                            interestComponent: payment.interest,
                            principalComponent: payment.scheduledPrincipal,
                            source: 'USER_ENTERED',
                            notes:
                              payment.periodNumber === 0
                                ? 'Broken-period interest paid to lender'
                                : `Monthly EMI repayment #${payment.periodNumber}`,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          }),
                        );
                      }}
                      className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/30"
                      title="Mark installment as paid"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Paid
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Shortcuts & Guidance */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle>Prepayment Strategy</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <p className="text-muted-foreground">
              Small extra monthly part-payments reduce interest by applying directly to principal before subsequent month interest accrues.
            </p>
            <div className="p-3 bg-muted/40 rounded-lg space-y-1">
              <span className="font-semibold text-foreground block">
                Recommended Actions:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
                <li>Set up a recurring monthly or annual bonus part-payment rule</li>
                <li>Simulate scenarios in the What-If Simulator</li>
                <li>Download your updated CSV backup for offline persistence</li>
              </ul>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => dispatch(setActiveTab('scenarios'))}
              className="w-full text-xs mt-2"
            >
              Open What-If Simulator
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
