import {
  AmortizationRow,
  CalculationResult,
  FCC_VERSION,
  Loan,
  LoanEvent,
  LocalDate,
  Money,
  PartPaymentOverride,
  PartPaymentRule,
  RepaymentMode,
} from './types';
import { calculateStandardEmi, calculateMonthlyInterest } from './emi';
import { calculateBrokenPeriod } from './brokenPeriod';
import { addMonthsToDate, compareDates, isBefore } from './dates';
import { resolveEffectivePartPayment } from './partPayments';

export interface ScheduleOptions {
  asOfDate?: LocalDate;
  includePartPayments?: boolean;
  rules?: PartPaymentRule[];
  overrides?: PartPaymentOverride[];
  events?: LoanEvent[];
  forcedRepaymentMode?: RepaymentMode;
}

/**
 * Generates an amortization schedule and KPIs based on loan parameters and payment events.
 *
 * Implements Financial Calculation Contract Version 1.0.
 */
export function generateAmortizationSchedule(
  loan: Loan,
  options: ScheduleOptions = {},
): CalculationResult {
  const {
    asOfDate,
    includePartPayments = true,
    rules = [],
    overrides = [],
    events = [],
    forcedRepaymentMode,
  } = options;

  const repaymentMode = forcedRepaymentMode ?? loan.repaymentMode;
  const originalEmi = calculateStandardEmi(
    loan.originalPrincipal,
    loan.annualInterestRate,
    loan.originalTenureMonths,
  );

  // 1. Broken period computation
  // 1. Broken period computation & payment events
  const brokenPeriodResult = calculateBrokenPeriod(
    loan.originalPrincipal,
    loan.annualInterestRate,
    loan.brokenPeriod,
  );

  const brokenPeriodEvents = events.filter(
    (e) => e.type === 'BROKEN_PERIOD_PAYMENT' && e.status !== 'CANCELLED',
  );

  const actualBpEvents = brokenPeriodEvents.filter((e) => e.status === 'ACTUAL');
  const actualBpInterest = actualBpEvents.reduce(
    (sum, e) => sum + (e.interestComponent ?? e.amount),
    0,
  );
  const actualBpPrincipal = actualBpEvents.reduce(
    (sum, e) => sum + (e.principalComponent ?? 0),
    0,
  );
  const totalBpEventAmount = brokenPeriodEvents.reduce((sum, e) => sum + e.amount, 0);
  const hasActualBpPayment = actualBpEvents.length > 0;

  // Include broken period row if loan has configured broken period or if payment events exist
  const hasBrokenPeriod =
    (loan.brokenPeriod && brokenPeriodResult.days > 0) || brokenPeriodEvents.length > 0;

  let currentBalance: Money = brokenPeriodResult.startingSchedulePrincipal;
  if (hasActualBpPayment && actualBpPrincipal > 0) {
    currentBalance = Math.max(0, currentBalance - actualBpPrincipal);
  }

  let activeEmi: Money = originalEmi;

  const rows: AmortizationRow[] = [];
  let cumulativePrincipal: Money = 0;
  let cumulativeInterest: Money = 0;
  let cumulativePayment: Money = 0;
  let cumulativePartPayment: Money = 0;

  // Add Broken Period row if applicable
  if (hasBrokenPeriod) {
    const bpDate =
      brokenPeriodEvents[0]?.date ??
      loan.brokenPeriod?.endDate ??
      loan.firstEmiDate;

    // Authoritative interest: if actual payment recorded, use actual paid interest;
    // else if custom/modeled interest in brokenPeriodResult > 0, use that;
    // else use planned event amount.
    const bpInterest = hasActualBpPayment
      ? actualBpInterest
      : brokenPeriodResult.interest > 0
        ? brokenPeriodResult.interest
        : totalBpEventAmount;

    const bpPrincipal = hasActualBpPayment
      ? actualBpPrincipal
      : brokenPeriodResult.principal;

    const bpTotalPayment = bpInterest + bpPrincipal;

    let bpStatus: 'ACTUAL' | 'PLANNED' | 'PROJECTED' = 'PROJECTED';
    if (hasActualBpPayment) {
      bpStatus = 'ACTUAL';
    } else if (asOfDate && !isBefore(asOfDate, bpDate)) {
      bpStatus = 'ACTUAL';
    } else if (brokenPeriodEvents.some((e) => e.status === 'PLANNED')) {
      bpStatus = 'PLANNED';
    }

    cumulativeInterest += bpInterest;
    cumulativePrincipal += bpPrincipal;
    cumulativePayment += bpTotalPayment;

    rows.push({
      periodNumber: 0,
      date: bpDate,
      openingBalance: loan.originalPrincipal,
      scheduledEmi: bpInterest,
      interest: bpInterest,
      scheduledPrincipal: bpPrincipal,
      partPayment: 0,
      fees: 0,
      totalPayment: bpTotalPayment,
      closingBalance: currentBalance,
      cumulativePrincipal,
      cumulativeInterest,
      cumulativePayment,
      cumulativePartPayment: 0,
      status: bpStatus,
      eventIds: brokenPeriodEvents.map((e) => e.id),
    });
  }

  // 2. Generate monthly periods
  // We allow a safety upper bound of originalTenureMonths * 2 to prevent infinite loops, though loans only reduce or finish.
  const maxPeriods = Math.max(loan.originalTenureMonths * 2, 360);
  let periodDate = loan.firstEmiDate;
  let periodNumber = 1;
  const claimedEventIds = new Set<string>();

  while (currentBalance > 0 && periodNumber <= maxPeriods) {
    const openingBalance = currentBalance;
    const monthlyInterest = calculateMonthlyInterest(
      openingBalance,
      loan.annualInterestRate,
    );

    // Final period adjustment: if balance + interest <= activeEmi, loan closes this month
    let scheduledPrincipal: Money;
    let scheduledEmi: Money;

    if (openingBalance + monthlyInterest <= activeEmi) {
      // Final regular payment closes remaining balance
      scheduledPrincipal = openingBalance;
      scheduledEmi = scheduledPrincipal + monthlyInterest;
    } else {
      scheduledEmi = activeEmi;
      scheduledPrincipal = Math.max(0, scheduledEmi - monthlyInterest);
      // In case scheduledPrincipal exceeds opening balance (safety guard)
      if (scheduledPrincipal > openingBalance) {
        scheduledPrincipal = openingBalance;
        scheduledEmi = scheduledPrincipal + monthlyInterest;
      }
    }

    // Resolve part-payment for this period
    let partPayment = 0;
    let partPaymentTreatment = repaymentMode;
    const periodEventIds: string[] = [];

    if (includePartPayments) {
      const resolved = resolveEffectivePartPayment(
        periodDate,
        openingBalance,
        rules,
        overrides,
        events,
        repaymentMode,
        periodNumber === 1,
        claimedEventIds,
      );

      partPayment = resolved.amount;
      partPaymentTreatment = resolved.treatment;
      if (resolved.eventIds) {
        periodEventIds.push(...resolved.eventIds);
        resolved.eventIds.forEach((id) => claimedEventIds.add(id));
      }

      // Invariant: Part-payment cannot exceed remaining balance after scheduled principal
      const remainingAfterScheduled = Math.max(0, openingBalance - scheduledPrincipal);
      if (partPayment > remainingAfterScheduled) {
        partPayment = remainingAfterScheduled;
      }
    }

    const totalPeriodPayment = scheduledEmi + partPayment;
    const totalPrincipalReduction = scheduledPrincipal + partPayment;
    const closingBalance = Math.max(0, openingBalance - totalPrincipalReduction);

    cumulativePrincipal += totalPrincipalReduction;
    cumulativeInterest += monthlyInterest;
    cumulativePayment += totalPeriodPayment;
    cumulativePartPayment += partPayment;

    // Check status: ACTUAL if actual payments recorded or date <= asOfDate, else PROJECTED
    let rowStatus: 'ACTUAL' | 'PLANNED' | 'PROJECTED' | 'CLOSED' = 'PROJECTED';
    const hasActualEventInPeriod = periodEventIds.some((id) => {
      const ev = events.find((e) => e.id === id);
      return ev?.status === 'ACTUAL';
    });
    if (hasActualEventInPeriod || (asOfDate && !isBefore(asOfDate, periodDate))) {
      rowStatus = 'ACTUAL';
    }
    if (closingBalance === 0) {
      rowStatus = 'CLOSED';
    }

    rows.push({
      periodNumber,
      date: periodDate,
      openingBalance,
      scheduledEmi,
      interest: monthlyInterest,
      scheduledPrincipal,
      partPayment,
      fees: 0,
      totalPayment: totalPeriodPayment,
      closingBalance,
      cumulativePrincipal,
      cumulativeInterest,
      cumulativePayment,
      cumulativePartPayment,
      status: rowStatus,
      eventIds: periodEventIds,
    });

    currentBalance = closingBalance;

    if (currentBalance === 0) {
      break;
    }

    // Handle REDUCE_EMI mode recalculation
    if (partPaymentTreatment === 'REDUCE_EMI' && partPayment > 0) {
      const remainingTenure = loan.originalTenureMonths - periodNumber;
      if (remainingTenure > 0 && currentBalance > 0) {
        activeEmi = calculateStandardEmi(
          currentBalance,
          loan.annualInterestRate,
          remainingTenure,
        );
      }
    }

    periodDate = addMonthsToDate(loan.firstEmiDate, periodNumber);
    periodNumber++;
  }

  // 3. Generate baseline schedule for comparison (without any part-payments or overrides)
  let baselineSchedule: AmortizationRow[] = [];
  if (includePartPayments) {
    const baselineResult = generateAmortizationSchedule(loan, {
      includePartPayments: false,
      events: options.events?.filter((e) => e.type === 'BROKEN_PERIOD_PAYMENT'),
      asOfDate,
    });
    baselineSchedule = baselineResult.schedule;
  } else {
    baselineSchedule = rows;
  }

  // 4. Compute KPIs
  const originalTotalInterest = baselineSchedule.reduce((sum, r) => sum + r.interest, 0);
  const originalTotalPayment = baselineSchedule.reduce((sum, r) => sum + r.totalPayment, 0);
  const originalMaturityDate =
    baselineSchedule.length > 0
      ? (baselineSchedule[baselineSchedule.length - 1]?.date ?? loan.firstEmiDate)
      : loan.firstEmiDate;

  const projectedTotalInterest = rows.reduce((sum, r) => sum + r.interest, 0);
  const projectedTotalPayment = rows.reduce((sum, r) => sum + r.totalPayment, 0);
  const projectedTotalPartPayments = rows.reduce((sum, r) => sum + r.partPayment, 0);
  const projectedMaturityDate =
    rows.length > 0 ? (rows[rows.length - 1]?.date ?? loan.firstEmiDate) : loan.firstEmiDate;

  // As-of date actual metrics
  const actualRows = asOfDate
    ? rows.filter((r) => r.status === 'ACTUAL' || compareDates(r.date, asOfDate) <= 0)
    : rows.filter((r) => r.status === 'ACTUAL');

  const actualPrincipalPaid = actualRows.reduce(
    (sum, r) => sum + r.scheduledPrincipal + r.partPayment,
    0,
  );
  const actualInterestPaid = actualRows.reduce((sum, r) => sum + r.interest, 0);
  const actualTotalPaid = actualRows.reduce((sum, r) => sum + r.totalPayment, 0);
  const actualPartPaymentsPaid = actualRows.reduce((sum, r) => sum + r.partPayment, 0);

  const currentOutstandingPrincipal =
    actualRows.length > 0
      ? (actualRows[actualRows.length - 1]?.closingBalance ?? loan.originalPrincipal)
      : loan.originalPrincipal;

  // Baseline rows up to as-of date or completed actual periods
  const maxActualPeriod = actualRows.reduce(
    (max, r) => Math.max(max, r.periodNumber),
    -1,
  );

  const baselineRowsToAsOf = baselineSchedule.filter((r) => {
    if (asOfDate && compareDates(r.date, asOfDate) <= 0) return true;
    if (maxActualPeriod >= 0 && r.periodNumber <= maxActualPeriod) return true;
    return false;
  });

  const baselineInterestToDate = baselineRowsToAsOf.reduce((sum, r) => sum + r.interest, 0);
  const baselinePrincipalToDate = baselineRowsToAsOf.reduce(
    (sum, r) => sum + r.scheduledPrincipal,
    0,
  );
  const baselineTotalPaidToDate = baselineRowsToAsOf.reduce((sum, r) => sum + r.totalPayment, 0);

  const realizedInterestSaving = Math.max(0, baselineInterestToDate - actualInterestPaid);
  const realizedInterestSavingPercentage =
    baselineInterestToDate > 0
      ? Math.round(((baselineInterestToDate - actualInterestPaid) / baselineInterestToDate) * 1000) / 10
      : 0;
  const projectedInterestSaving = Math.max(0, originalTotalInterest - projectedTotalInterest);

  const baselinePeriodsCount = baselineSchedule.filter((r) => r.periodNumber > 0).length;
  const projectedPeriodsCount = rows.filter((r) => r.periodNumber > 0).length;
  const projectedTenureSavedMonths = Math.max(
    0,
    baselinePeriodsCount - projectedPeriodsCount,
  );

  // Calculate total loan interest saved strictly from prepayments made till today
  let savingsFromActualPrepayments = projectedInterestSaving;
  let tenureSavedFromActualPrepaymentsMonths = projectedTenureSavedMonths;

  if (includePartPayments && (rules.length > 0 || overrides.length > 0)) {
    const actualsOnlyResult = generateAmortizationSchedule(loan, {
      includePartPayments: true,
      rules: [],
      overrides: [],
      events: events.filter(
        (e) =>
          e.status === 'ACTUAL' || (asOfDate && compareDates(e.date, asOfDate) <= 0),
      ),
      asOfDate,
    });
    const actualsOnlyTotalInterest = actualsOnlyResult.schedule.reduce(
      (sum, r) => sum + r.interest,
      0,
    );
    const actualsOnlyPeriodsCount = actualsOnlyResult.schedule.filter(
      (r) => r.periodNumber > 0,
    ).length;
    savingsFromActualPrepayments = Math.max(
      0,
      originalTotalInterest - actualsOnlyTotalInterest,
    );
    tenureSavedFromActualPrepaymentsMonths = Math.max(
      0,
      baselinePeriodsCount - actualsOnlyPeriodsCount,
    );
  }

  const remainingTenureMonths = Math.max(
    0,
    projectedPeriodsCount - actualRows.filter((r) => r.periodNumber > 0).length,
  );
  const remainingInterest = Math.max(0, projectedTotalInterest - actualInterestPaid);

  const isClosed = currentBalance === 0;
  const closureDate = isClosed ? projectedMaturityDate : undefined;

  return {
    contractVersion: FCC_VERSION,
    calculatedAt: new Date().toISOString(),
    loanId: loan.id,
    baselineSchedule,
    schedule: rows,
    isClosed,
    closureDate,
    kpis: {
      originalPrincipal: loan.originalPrincipal,
      originalEmi,
      originalTenureMonths: loan.originalTenureMonths,
      originalTotalInterest,
      originalTotalPayment,
      originalMaturityDate,

      currentOutstandingPrincipal,
      currentEmi: activeEmi,
      remainingTenureMonths,
      remainingInterest,
      projectedMaturityDate,

      actualPrincipalPaid,
      actualInterestPaid,
      actualTotalPaid,
      actualPartPaymentsPaid,

      projectedTotalInterest,
      projectedTotalPayment,
      projectedTotalPartPayments,

      baselineInterestToDate,
      baselinePrincipalToDate,
      baselineTotalPaidToDate,
      realizedInterestSaving,
      realizedInterestSavingPercentage: Math.max(0, realizedInterestSavingPercentage),
      savingsFromActualPrepayments,
      tenureSavedFromActualPrepaymentsMonths,
      elapsedPeriodsCount: actualRows.filter((r) => r.periodNumber > 0).length,
      projectedInterestSaving,
      realizedTenureSavedMonths: 0, // Incurred actual months reduction
      projectedTenureSavedMonths,
    },
  };
}

