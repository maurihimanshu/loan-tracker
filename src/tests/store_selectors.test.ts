import { describe, it, expect } from 'vitest';
import { store } from '../app/store';
import { addLoan, setActiveLoan } from '../features/loans/loanSlice';
import { addRule } from '../features/partPayments/partPaymentSlice';
import { addScenario } from '../features/scenarios/scenarioSlice';
import {
  selectActiveLoan,
  selectActiveCalculation,
  selectActiveKpis,
  selectScenarioResults,
  selectAggregateKpis,
} from '../app/selectors';
import { Loan } from '../domain/loan/types';
import { rupeesToPaise } from '../domain/loan/money';

describe('Redux Store & Selectors Integration', () => {
  const testLoan: Loan = {
    id: 'redux-test-loan-1',
    name: 'Home Loan Redux',
    currency: 'INR',
    originalPrincipal: rupeesToPaise(5000000), // 50 Lakhs
    annualInterestRate: 8.5,
    originalTenureMonths: 240, // 20 years
    startDate: '2026-09-01',
    firstEmiDate: '2026-10-01',
    repaymentFrequency: 'MONTHLY',
    repaymentMode: 'REDUCE_TENURE',
    interestMethod: 'MONTHLY_REDUCING_BALANCE',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('adds loan and selects active loan correctly', () => {
    store.dispatch(addLoan(testLoan));
    store.dispatch(setActiveLoan(testLoan.id));

    const state = store.getState();
    const active = selectActiveLoan(state);
    expect(active?.id).toBe(testLoan.id);

    const calc = selectActiveCalculation(state);
    expect(calc).not.toBeNull();
    expect(calc?.kpis.originalPrincipal).toBe(testLoan.originalPrincipal);
  });

  it('updates derived KPIs dynamically when part payment rules are added', () => {
    const baselineKpis = selectActiveKpis(store.getState());
    expect(baselineKpis).not.toBeNull();

    // Add recurring part-payment rule
    store.dispatch(
      addRule({
        id: 'redux-rule-1',
        loanId: testLoan.id,
        startDate: '2027-01-01',
        frequency: 'MONTHLY',
        amountType: 'FIXED',
        amount: rupeesToPaise(30000), // 30k monthly extra
        treatment: 'REDUCE_TENURE',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    const updatedKpis = selectActiveKpis(store.getState());
    expect(updatedKpis?.projectedInterestSaving).toBeGreaterThan(0);
    expect(updatedKpis?.projectedTenureSavedMonths).toBeGreaterThan(0);
  });

  it('calculates scenarios through selectors', () => {
    store.dispatch(
      addScenario({
        id: 'redux-scen-1',
        loanId: testLoan.id,
        name: 'Extra 50K Monthly',
        additionalMonthlyPayment: rupeesToPaise(50000),
        oneTimePayments: [],
        repaymentMode: 'REDUCE_TENURE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    const state = store.getState();
    const scenarios = selectScenarioResults(state);
    expect(scenarios.length).toBe(1);
    expect(scenarios[0]!.interestSavedVsBaseline).toBeGreaterThan(0);
  });

  it('calculates aggregate metrics across multiple loans', () => {
    const secondLoan: Loan = {
      id: 'redux-test-loan-2',
      name: 'Car Loan',
      currency: 'INR',
      originalPrincipal: rupeesToPaise(1000000), // 10 Lakhs
      annualInterestRate: 9.0,
      originalTenureMonths: 60, // 5 years
      startDate: '2026-09-01',
      firstEmiDate: '2026-10-01',
      repaymentFrequency: 'MONTHLY',
      repaymentMode: 'REDUCE_TENURE',
      interestMethod: 'MONTHLY_REDUCING_BALANCE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.dispatch(addLoan(secondLoan));

    const aggregate = selectAggregateKpis(store.getState());
    expect(aggregate.loanCount).toBe(2);
    expect(aggregate.totalOriginalPrincipal).toBe(rupeesToPaise(6000000));
  });
});
