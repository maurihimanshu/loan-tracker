import {
  CalculationResult,
  Loan,
  LoanEvent,
  PartPaymentOverride,
  PartPaymentRule,
  Scenario,
  ScenarioResult,
} from './types';
import { generateAmortizationSchedule } from './amortization';

/**
 * Calculates a scenario projection immutably starting from the loan baseline or current projection.
 */
export function calculateScenario(
  loan: Loan,
  scenario: Scenario,
  currentProjection: CalculationResult,
  existingRules: PartPaymentRule[] = [],
  existingOverrides: PartPaymentOverride[] = [],
  existingEvents: LoanEvent[] = [],
): ScenarioResult {
  // Construct scenario-specific recurring rule if scenario has additional monthly payment
  const scenarioRules: PartPaymentRule[] = [...existingRules];

  if (scenario.additionalMonthlyPayment > 0) {
    scenarioRules.push({
      id: `scenario-rule-${scenario.id}`,
      loanId: loan.id,
      startDate: scenario.startDate ?? loan.firstEmiDate,
      endDate: scenario.endDate,
      frequency: 'MONTHLY',
      amountType: 'FIXED',
      amount: scenario.additionalMonthlyPayment,
      treatment: scenario.repaymentMode,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Construct one-time events from scenario
  const scenarioEvents: LoanEvent[] = [...existingEvents];
  for (const ot of scenario.oneTimePayments) {
    scenarioEvents.push({
      id: `scenario-event-${ot.id}`,
      loanId: loan.id,
      date: ot.date,
      type: 'PART_PAYMENT',
      status: 'PLANNED',
      amount: ot.amount,
      source: 'USER_ENTERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Generate schedule for scenario with forced repayment mode if specified
  const scenarioCalculation = generateAmortizationSchedule(loan, {
    includePartPayments: true,
    rules: scenarioRules,
    overrides: existingOverrides,
    events: scenarioEvents,
    forcedRepaymentMode: scenario.repaymentMode,
  });

  const baselineKpis = currentProjection.kpis;
  const scenarioKpis = scenarioCalculation.kpis;

  const baselinePeriods = currentProjection.baselineSchedule.filter(
    (r) => r.periodNumber > 0,
  ).length;
  const currentPeriods = currentProjection.schedule.filter((r) => r.periodNumber > 0).length;
  const scenarioPeriods = scenarioCalculation.schedule.filter((r) => r.periodNumber > 0).length;

  const interestSavedVsBaseline = Math.max(
    0,
    baselineKpis.originalTotalInterest - scenarioKpis.projectedTotalInterest,
  );
  const tenureSavedMonths = Math.max(0, baselinePeriods - scenarioPeriods);

  const interestSavedVsCurrentProjection = Math.max(
    0,
    currentProjection.kpis.projectedTotalInterest - scenarioKpis.projectedTotalInterest,
  );
  const tenureSavedMonthsVsCurrentProjection = Math.max(
    0,
    currentPeriods - scenarioPeriods,
  );

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    startingBalance: loan.originalPrincipal,
    totalFuturePayments: scenarioKpis.projectedTotalPayment,
    projectedInterest: scenarioKpis.projectedTotalInterest,
    projectedPrincipal: scenarioKpis.originalPrincipal,
    projectedClosureDate: scenarioKpis.projectedMaturityDate,
    remainingTenureMonths: scenarioPeriods,
    interestSavedVsBaseline,
    tenureSavedMonths,
    interestSavedVsCurrentProjection,
    tenureSavedMonthsVsCurrentProjection,
    schedule: scenarioCalculation.schedule,
  };
}

