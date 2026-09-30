import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import {
  CalculationResult,
  Loan,
  LoanEvent,
  PartPaymentOverride,
  PartPaymentRule,
  Scenario,
  ScenarioResult,
} from '../domain/loan/types';
import { generateAmortizationSchedule } from '../domain/loan/amortization';
import { calculateScenario } from '../domain/loan/scenarios';
import { compareDates } from '../domain/loan/dates';

// Base selectors
export const selectLoans = (state: RootState) => state.loans.loans;
export const selectActiveLoanId = (state: RootState) => state.loans.activeLoanId;
export const selectEvents = (state: RootState) => state.payments.events;
export const selectRules = (state: RootState) => state.partPayments.rules;
export const selectOverrides = (state: RootState) => state.partPayments.overrides;
export const selectScenarios = (state: RootState) => state.scenarios.scenarios;
export const selectSelectedScenarioId = (state: RootState) => state.scenarios.selectedScenarioId;
export const selectAsOfDate = (state: RootState) => state.ui.asOfDate;
export const selectActiveTab = (state: RootState) => state.ui.activeTab;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectFileState = (state: RootState) => state.fileManagement;

// Active Loan
export const selectActiveLoan = createSelector(
  [selectLoans, selectActiveLoanId],
  (loans, activeId): Loan | null => {
    if (!activeId) return loans[0] ?? null;
    return loans.find((l) => l.id === activeId) ?? loans[0] ?? null;
  },
);

// Active Loan's Events
export const selectActiveLoanEvents = createSelector(
  [selectEvents, selectActiveLoan],
  (events, activeLoan): LoanEvent[] => {
    if (!activeLoan) return [];
    return events.filter((e) => e.loanId === activeLoan.id);
  },
);

// Active Loan's Rules
export const selectActiveLoanRules = createSelector(
  [selectRules, selectActiveLoan],
  (rules, activeLoan): PartPaymentRule[] => {
    if (!activeLoan) return [];
    return rules.filter((r) => r.loanId === activeLoan.id);
  },
);

// Active Loan's Overrides
export const selectActiveLoanOverrides = createSelector(
  [selectOverrides, selectActiveLoan],
  (overrides, activeLoan): PartPaymentOverride[] => {
    if (!activeLoan) return [];
    return overrides.filter((o) => o.loanId === activeLoan.id);
  },
);

// Active Loan's Scenarios
export const selectActiveLoanScenarios = createSelector(
  [selectScenarios, selectActiveLoan],
  (scenarios, activeLoan): Scenario[] => {
    if (!activeLoan) return [];
    return scenarios.filter((s) => s.loanId === activeLoan.id);
  },
);

// Core Memoized Calculation Result for Active Loan
export const selectActiveCalculation = createSelector(
  [
    selectActiveLoan,
    selectActiveLoanRules,
    selectActiveLoanOverrides,
    selectActiveLoanEvents,
    selectAsOfDate,
  ],
  (
    activeLoan,
    rules,
    overrides,
    events,
    asOfDate,
  ): CalculationResult | null => {
    if (!activeLoan) return null;
    return generateAmortizationSchedule(activeLoan, {
      asOfDate,
      includePartPayments: true,
      rules,
      overrides,
      events,
    });
  },
);

// Active Schedule & Baseline
export const selectActiveSchedule = createSelector(
  [selectActiveCalculation],
  (calc) => calc?.schedule ?? [],
);

export const selectActiveBaselineSchedule = createSelector(
  [selectActiveCalculation],
  (calc) => calc?.baselineSchedule ?? [],
);

// Active KPIs
export const selectActiveKpis = createSelector(
  [selectActiveCalculation],
  (calc) => calc?.kpis ?? null,
);

// Active Scenarios Results
export const selectScenarioResults = createSelector(
  [
    selectActiveLoan,
    selectActiveCalculation,
    selectActiveLoanScenarios,
    selectActiveLoanRules,
    selectActiveLoanOverrides,
    selectActiveLoanEvents,
  ],
  (
    loan,
    calc,
    scenarios,
    rules,
    overrides,
    events,
  ): ScenarioResult[] => {
    if (!loan || !calc) return [];
    return scenarios.map((scenario) =>
      calculateScenario(loan, scenario, calc, rules, overrides, events),
    );
  },
);

// Selected Scenario Result
export const selectSelectedScenarioResult = createSelector(
  [selectScenarioResults, selectSelectedScenarioId],
  (results, selectedId): ScenarioResult | null => {
    if (results.length === 0) return null;
    if (!selectedId) return results[0] ?? null;
    return results.find((r) => r.scenarioId === selectedId) ?? results[0] ?? null;
  },
);

// Upcoming Payments from As-Of Date
export const selectUpcomingPayments = createSelector(
  [selectActiveSchedule, selectAsOfDate],
  (schedule, asOfDate) => {
    const futureRows = schedule.filter(
      (r) => r.status !== 'ACTUAL' && compareDates(r.date, asOfDate) >= 0,
    );
    return futureRows.slice(0, 3);
  },
);

// Aggregate KPIs across all loans (Section 77)
export const selectAggregateKpis = createSelector(
  [selectLoans, selectRules, selectOverrides, selectEvents, selectAsOfDate],
  (loans, allRules, allOverrides, allEvents, asOfDate) => {
    let totalOriginalPrincipal = 0;
    let totalOutstandingPrincipal = 0;
    let totalCurrentEmi = 0;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalRemainingInterest = 0;
    let totalProjectedInterestSaving = 0;
    let totalRealizedInterestSaving = 0;
    let totalSavingsFromActualPrepayments = 0;
    let totalBaselineInterestToDate = 0;
    let totalPartPaymentsPaid = 0;

    for (const loan of loans) {
      const loanRules = allRules.filter((r) => r.loanId === loan.id);
      const loanOverrides = allOverrides.filter((o) => o.loanId === loan.id);
      const loanEvents = allEvents.filter((e) => e.loanId === loan.id);

      const calc = generateAmortizationSchedule(loan, {
        asOfDate,
        rules: loanRules,
        overrides: loanOverrides,
        events: loanEvents,
      });

      totalOriginalPrincipal += calc.kpis.originalPrincipal;
      totalOutstandingPrincipal += calc.kpis.currentOutstandingPrincipal;
      totalCurrentEmi += calc.kpis.currentEmi;
      totalPrincipalPaid += calc.kpis.actualPrincipalPaid;
      totalInterestPaid += calc.kpis.actualInterestPaid;
      totalRemainingInterest += calc.kpis.remainingInterest;
      totalProjectedInterestSaving += calc.kpis.projectedInterestSaving;
      totalRealizedInterestSaving += calc.kpis.realizedInterestSaving;
      totalSavingsFromActualPrepayments += calc.kpis.savingsFromActualPrepayments;
      totalBaselineInterestToDate += calc.kpis.baselineInterestToDate;
      totalPartPaymentsPaid += calc.kpis.actualPartPaymentsPaid;
    }

    return {
      loanCount: loans.length,
      totalOriginalPrincipal,
      totalOutstandingPrincipal,
      totalCurrentEmi,
      totalPrincipalPaid,
      totalInterestPaid,
      totalRemainingInterest,
      totalProjectedInterestSaving,
      totalRealizedInterestSaving,
      totalSavingsFromActualPrepayments,
      totalBaselineInterestToDate,
      totalPartPaymentsPaid,
    };
  },
);

// Full Export Data Payload for CSV and persistence
export const selectFullExportPayload = createSelector(
  [selectLoans, selectEvents, selectRules, selectOverrides, selectScenarios],
  (loans, events, rules, overrides, scenarios) => ({
    loans,
    events,
    rules,
    overrides,
    scenarios,
  }),
);


