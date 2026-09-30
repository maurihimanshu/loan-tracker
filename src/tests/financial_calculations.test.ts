import { describe, it, expect } from 'vitest';
import {
  Loan,
  PartPaymentRule,
  PartPaymentOverride,
  LoanEvent,
  Scenario,
} from '../domain/loan/types';
import {
  calculateStandardEmi,
  calculateMonthlyInterest,
} from '../domain/loan/emi';
import {
  rupeesToPaise,
  paiseToRupees,
  roundHalfUp,
  formatINR,
} from '../domain/loan/money';
import {
  addMonthsToDate,
  daysBetween,
  isLeapYear,
  daysInMonth,
} from '../domain/loan/dates';
import { calculateBrokenPeriod } from '../domain/loan/brokenPeriod';
import { resolveEffectivePartPayment } from '../domain/loan/partPayments';
import { generateAmortizationSchedule } from '../domain/loan/amortization';
import { calculateScenario } from '../domain/loan/scenarios';

describe('Financial Calculation Contract: Unit & Invariant Tests', () => {
  describe('1. Money & Rounding Precision', () => {
    it('accurately converts Rupees to paise using HALF_UP', () => {
      expect(rupeesToPaise(1000.5)).toBe(100050);
      expect(rupeesToPaise(1234.56)).toBe(123456);
      expect(rupeesToPaise(0.005)).toBe(1); // 0.005 * 100 = 0.5 -> rounds to 1
      expect(rupeesToPaise(0.004)).toBe(0); // 0.004 * 100 = 0.4 -> rounds to 0
    });

    it('accurately converts paise back to rupees', () => {
      expect(paiseToRupees(100050)).toBe(1000.5);
      expect(paiseToRupees(123456)).toBe(1234.56);
    });

    it('formats INR correctly with Indian numbering system', () => {
      const formatted = formatINR(rupeesToPaise(1234567), false);
      expect(formatted).toContain('12,34,567');
    });

    it('implements deterministic HALF_UP rounding', () => {
      expect(roundHalfUp(1.2)).toBe(1);
      expect(roundHalfUp(1.5)).toBe(2);
      expect(roundHalfUp(2.5)).toBe(3);
      expect(roundHalfUp(-1.5)).toBe(-2);
    });
  });

  describe('2. Date Arithmetic & Month-End Bounds', () => {
    it('handles leap years correctly', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2026)).toBe(false);
      expect(isLeapYear(2028)).toBe(true);
      expect(daysInMonth(2024, 2)).toBe(29);
      expect(daysInMonth(2026, 2)).toBe(28);
    });

    it('clamps month-end dates to avoid JavaScript date overflow', () => {
      // Jan 31 + 1 month -> Feb 28 in non-leap year (2026)
      expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
      // Jan 31 + 1 month -> Feb 29 in leap year (2028)
      expect(addMonthsToDate('2028-01-31', 1)).toBe('2028-02-29');
      // Aug 31 + 1 month -> Sep 30
      expect(addMonthsToDate('2026-08-31', 1)).toBe('2026-09-30');
    });

    it('computes days between dates correctly', () => {
      expect(daysBetween('2026-09-15', '2026-10-05')).toBe(20);
      expect(daysBetween('2026-01-01', '2026-01-02')).toBe(1);
      expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
    });
  });

  describe('3. Standard EMI Calculation (Contract Section 72 Reference Fixture)', () => {
    it('calculates canonical ₹10L, 12%, 12-month loan EMI to exactly ₹88,848.79 (8884879 paise)', () => {
      const principal = rupeesToPaise(1000000); // 100,000,000 paise
      const rate = 12; // 12%
      const tenure = 12; // 12 months

      const emi = calculateStandardEmi(principal, rate, tenure);
      expect(emi).toBe(8884879); // ₹88,848.79
      expect(paiseToRupees(emi)).toBe(88848.79);
    });

    it('calculates monthly interest accurately on opening balance', () => {
      const balance = rupeesToPaise(1000000);
      const interest = calculateMonthlyInterest(balance, 12);
      // 1000000 * 0.01 = 10000 Rupees = 1000000 paise
      expect(interest).toBe(1000000);
    });

    it('handles zero-interest loan (rate = 0%)', () => {
      const principal = rupeesToPaise(120000);
      const emi = calculateStandardEmi(principal, 0, 12);
      expect(emi).toBe(rupeesToPaise(10000));
    });
  });

  describe('4. Broken Period Calculation', () => {
    const principal = rupeesToPaise(5000000); // ₹50 Lakhs
    const rate = 8.5; // 8.5%

    it('computes INTEREST_ONLY broken period interest using Actual/365', () => {
      // 20 days broken period
      const result = calculateBrokenPeriod(principal, rate, {
        startDate: '2026-09-15',
        endDate: '2026-10-05',
        treatment: 'INTEREST_ONLY',
        dayCount: 'ACTUAL_365',
      });

      expect(result.days).toBe(20);
      // Modeled: 50,00,000 * 0.085 * (20/365) = 23,287.671... -> 2328767 paise (₹23,287.67)
      expect(result.interest).toBe(2328767);
      expect(result.principal).toBe(0);
      expect(result.totalPayment).toBe(2328767);
      expect(result.startingSchedulePrincipal).toBe(principal);
    });

    it('computes CAPITALIZE_INTEREST: adds interest to starting principal', () => {
      const result = calculateBrokenPeriod(principal, rate, {
        startDate: '2026-09-15',
        endDate: '2026-10-05',
        treatment: 'CAPITALIZE_INTEREST',
        dayCount: 'ACTUAL_365',
      });

      expect(result.totalPayment).toBe(0);
      expect(result.capitalizedAmount).toBe(2328767);
      expect(result.startingSchedulePrincipal).toBe(principal + 2328767);
    });

    it('accepts USER_ENTERED broken period values as authoritative', () => {
      const customInt = rupeesToPaise(25000);
      const customPrin = rupeesToPaise(10000);
      const result = calculateBrokenPeriod(principal, rate, {
        startDate: '2026-09-15',
        endDate: '2026-10-05',
        treatment: 'USER_ENTERED',
        dayCount: 'ACTUAL_365',
        customInterest: customInt,
        customPrincipal: customPrin,
        customTotal: customInt + customPrin,
      });

      expect(result.interest).toBe(customInt);
      expect(result.principal).toBe(customPrin);
      expect(result.totalPayment).toBe(customInt + customPrin);
      expect(result.startingSchedulePrincipal).toBe(principal - customPrin);
    });
  });

  describe('5. Part-Payment Precedence Resolution', () => {
    const targetDate = '2027-03-05';
    const openingBalance = rupeesToPaise(4000000);

    const recurringRule: PartPaymentRule = {
      id: 'rule-1',
      loanId: 'loan-1',
      startDate: '2027-01-05',
      frequency: 'MONTHLY',
      amountType: 'FIXED',
      amount: rupeesToPaise(25000),
      treatment: 'REDUCE_TENURE',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
    };

    it('1. Explicit cancellation takes highest priority (yields ₹0)', () => {
      const override: PartPaymentOverride = {
        id: 'ov-1',
        loanId: 'loan-1',
        date: targetDate,
        amount: 0,
        cancelled: true,
        createdAt: '',
        updatedAt: '',
      };

      const oneTime: LoanEvent = {
        id: 'ev-1',
        loanId: 'loan-1',
        date: targetDate,
        type: 'PART_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(50000),
        source: 'USER_ENTERED',
        createdAt: '',
        updatedAt: '',
      };

      const resolved = resolveEffectivePartPayment(
        targetDate,
        openingBalance,
        [recurringRule],
        [override],
        [oneTime],
        'REDUCE_TENURE',
      );

      expect(resolved.source).toBe('CANCELLED');
      expect(resolved.amount).toBe(0);
    });

    it('2. Explicit override takes priority over one-time and recurring', () => {
      const override: PartPaymentOverride = {
        id: 'ov-2',
        loanId: 'loan-1',
        date: targetDate,
        amount: rupeesToPaise(75000),
        cancelled: false,
        createdAt: '',
        updatedAt: '',
      };

      const resolved = resolveEffectivePartPayment(
        targetDate,
        openingBalance,
        [recurringRule],
        [override],
        [],
        'REDUCE_TENURE',
      );

      expect(resolved.source).toBe('OVERRIDE');
      expect(resolved.amount).toBe(rupeesToPaise(75000));
    });

    it('3. One-time payment takes priority over recurring rule', () => {
      const oneTime: LoanEvent = {
        id: 'ev-2',
        loanId: 'loan-1',
        date: targetDate,
        type: 'PART_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(100000),
        source: 'USER_ENTERED',
        createdAt: '',
        updatedAt: '',
      };

      const resolved = resolveEffectivePartPayment(
        targetDate,
        openingBalance,
        [recurringRule],
        [],
        [oneTime],
        'REDUCE_TENURE',
      );

      expect(resolved.source).toBe('ONE_TIME');
      expect(resolved.amount).toBe(rupeesToPaise(100000));
    });

    it('4. Recurring rule applies when no overrides or one-time payments exist', () => {
      const resolved = resolveEffectivePartPayment(
        targetDate,
        openingBalance,
        [recurringRule],
        [],
        [],
        'REDUCE_TENURE',
      );

      expect(resolved.source).toBe('RECURRING_RULE');
      expect(resolved.amount).toBe(rupeesToPaise(25000));
    });

    it('5. Percentage-based recurring rule calculates percentage of opening balance', () => {
      const pctRule: PartPaymentRule = {
        ...recurringRule,
        amountType: 'PERCENTAGE',
        amount: 10, // 10%
      };

      const resolved = resolveEffectivePartPayment(
        targetDate,
        openingBalance, // ₹40 Lakhs
        [pctRule],
        [],
        [],
        'REDUCE_TENURE',
      );

      // 10% of 40 Lakhs = 4 Lakhs
      expect(resolved.amount).toBe(rupeesToPaise(400000));
    });
  });

  describe('6. Baseline Schedule & Invariants (Contract Section 71 & 72)', () => {
    const loan: Loan = {
      id: 'test-canonical-loan',
      name: 'Reference ₹10L 12% 12M Loan',
      currency: 'INR',
      originalPrincipal: rupeesToPaise(1000000),
      annualInterestRate: 12,
      originalTenureMonths: 12,
      startDate: '2026-09-01',
      firstEmiDate: '2026-10-01',
      repaymentFrequency: 'MONTHLY',
      repaymentMode: 'REDUCE_TENURE',
      interestMethod: 'MONTHLY_REDUCING_BALANCE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('generates exactly 12 periods for canonical loan and reaches zero closing balance', () => {
      const result = generateAmortizationSchedule(loan);
      expect(result.schedule.length).toBe(12);

      const finalRow = result.schedule[11]!;
      expect(finalRow.closingBalance).toBe(0);
      expect(result.isClosed).toBe(true);
    });

    it('Invariant 1: No negative balances anywhere in the schedule', () => {
      const result = generateAmortizationSchedule(loan);
      for (const row of result.schedule) {
        expect(row.openingBalance).toBeGreaterThanOrEqual(0);
        expect(row.closingBalance).toBeGreaterThanOrEqual(0);
        expect(row.scheduledPrincipal).toBeGreaterThanOrEqual(0);
        expect(row.interest).toBeGreaterThanOrEqual(0);
      }
    });

    it('Invariant 2: Original principal is strictly conserved across closed loan', () => {
      const result = generateAmortizationSchedule(loan);
      const totalPrincipalPaid = result.schedule.reduce(
        (sum, r) => sum + r.scheduledPrincipal + r.partPayment,
        0,
      );
      expect(totalPrincipalPaid).toBe(loan.originalPrincipal);
    });

    it('Invariant 3: scheduledEmi = interest + scheduledPrincipal for all regular rows', () => {
      const result = generateAmortizationSchedule(loan);
      for (const row of result.schedule) {
        expect(row.scheduledEmi).toBe(row.interest + row.scheduledPrincipal);
      }
    });

    it('Invariant 4: Final payment correctly absorbs rounding residual to close loan', () => {
      const result = generateAmortizationSchedule(loan);
      const finalRow = result.schedule[result.schedule.length - 1]!;
      expect(finalRow.scheduledPrincipal).toBe(finalRow.openingBalance);
      expect(finalRow.closingBalance).toBe(0);
    });
  });

  describe('7. Part-Payment Behavior: REDUCE_TENURE vs REDUCE_EMI', () => {
    const loan: Loan = {
      id: 'tenure-vs-emi-loan',
      name: 'Tenure vs EMI test',
      currency: 'INR',
      originalPrincipal: rupeesToPaise(1000000),
      annualInterestRate: 12,
      originalTenureMonths: 12,
      startDate: '2026-09-01',
      firstEmiDate: '2026-10-01',
      repaymentFrequency: 'MONTHLY',
      repaymentMode: 'REDUCE_TENURE',
      interestMethod: 'MONTHLY_REDUCING_BALANCE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const partPaymentRule: PartPaymentRule = {
      id: 'pp-rule-1',
      loanId: loan.id,
      startDate: '2026-11-01', // Month 2
      frequency: 'MONTHLY',
      amountType: 'FIXED',
      amount: rupeesToPaise(25000),
      treatment: 'REDUCE_TENURE',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
    };

    it('REDUCE_TENURE: Keeps EMI constant and reduces total tenure', () => {
      const result = generateAmortizationSchedule(loan, {
        rules: [partPaymentRule],
        forcedRepaymentMode: 'REDUCE_TENURE',
      });

      // Without part payment: 12 months. With ₹25,000/mo extra: loan closes much earlier!
      expect(result.schedule.length).toBeLessThan(12);
      expect(result.kpis.projectedTenureSavedMonths).toBeGreaterThan(0);
      expect(result.kpis.projectedInterestSaving).toBeGreaterThan(0);

      // Verify EMI in regular periods remains unchanged from original EMI
      const regularRow = result.schedule[1]!; // Month 2
      expect(regularRow.scheduledEmi).toBe(result.kpis.originalEmi);
    });

    it('REDUCE_EMI: Recalculates lower EMI while maintaining remaining tenure', () => {
      const emiRule: PartPaymentRule = {
        ...partPaymentRule,
        treatment: 'REDUCE_EMI',
      };

      const result = generateAmortizationSchedule(loan, {
        rules: [emiRule],
        forcedRepaymentMode: 'REDUCE_EMI',
      });

      // EMI in month 3 should be less than original EMI because month 2 had a part-payment
      const month2Row = result.schedule[1]!;
      const month3Row = result.schedule[2]!;

      expect(month2Row.partPayment).toBe(rupeesToPaise(25000));
      expect(month3Row.scheduledEmi).toBeLessThan(result.kpis.originalEmi);
    });

    it('Part-payment exceeding outstanding balance clamps to balance and closes loan', () => {
      const hugePayment: LoanEvent = {
        id: 'huge-pp',
        loanId: loan.id,
        date: '2026-10-01',
        type: 'PART_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(2000000), // Exceeds ₹10L principal
        source: 'USER_ENTERED',
        createdAt: '',
        updatedAt: '',
      };

      const result = generateAmortizationSchedule(loan, {
        events: [hugePayment],
      });

      // In month 1, part payment should clamp to remaining balance after scheduled principal
      const firstRow = result.schedule[0]!;
      expect(firstRow.closingBalance).toBe(0);
      expect(result.schedule.length).toBe(1);
      expect(result.isClosed).toBe(true);
    });
  });

  describe('8. Scenario Simulation & Independence', () => {
    const loan: Loan = {
      id: 'scenario-test-loan',
      name: 'Scenario test loan',
      currency: 'INR',
      originalPrincipal: rupeesToPaise(3000000), // ₹30 Lakhs
      annualInterestRate: 9,
      originalTenureMonths: 120, // 10 years
      startDate: '2026-09-01',
      firstEmiDate: '2026-10-01',
      repaymentFrequency: 'MONTHLY',
      repaymentMode: 'REDUCE_TENURE',
      interestMethod: 'MONTHLY_REDUCING_BALANCE',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('calculates scenario without mutating baseline or original loan', () => {
      const currentProjection = generateAmortizationSchedule(loan);
      const scenario: Scenario = {
        id: 'scen-1',
        loanId: loan.id,
        name: '₹20K Extra Monthly',
        additionalMonthlyPayment: rupeesToPaise(20000),
        oneTimePayments: [],
        repaymentMode: 'REDUCE_TENURE',
        createdAt: '',
        updatedAt: '',
      };

      const scenarioResult = calculateScenario(loan, scenario, currentProjection);

      // Verify scenario results
      expect(scenarioResult.interestSavedVsBaseline).toBeGreaterThan(0);
      expect(scenarioResult.tenureSavedMonths).toBeGreaterThan(0);
      expect(scenarioResult.remainingTenureMonths).toBeLessThan(120);

      // Verify original baseline is unmutated
      const verifyBaseline = generateAmortizationSchedule(loan);
      expect(verifyBaseline.kpis.originalTotalInterest).toBe(
        currentProjection.kpis.originalTotalInterest,
      );
    });
  });

  describe('9. Broken-Period Interest Payment Events (User Rs. 4,027 paid pre-EMI)', () => {
    const loan: Loan = {
      id: 'loan-with-bp',
      name: 'Home Loan with Broken Period',
      currency: 'INR',
      originalPrincipal: rupeesToPaise(5000000), // ₹50 Lakhs
      annualInterestRate: 8.5,
      originalTenureMonths: 240,
      startDate: '2026-09-15',
      firstEmiDate: '2026-11-05',
      repaymentFrequency: 'MONTHLY',
      repaymentMode: 'REDUCE_TENURE',
      interestMethod: 'MONTHLY_REDUCING_BALANCE',
      brokenPeriod: {
        startDate: '2026-09-15',
        endDate: '2026-11-05',
        treatment: 'INTEREST_ONLY',
        dayCount: 'ACTUAL_365',
      },
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('accurately captures pre-EMI broken period interest payment of ₹4,027 in schedule and KPIs', () => {
      const bpPaymentEvent: LoanEvent = {
        id: 'bp-event-4027',
        loanId: loan.id,
        date: '2026-10-15',
        type: 'BROKEN_PERIOD_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(4027), // ₹4,027 = 402700 paise
        interestComponent: rupeesToPaise(4027),
        principalComponent: 0,
        source: 'USER_ENTERED',
        notes: 'Broken period interest paid before first EMI started',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = generateAmortizationSchedule(loan, {
        events: [bpPaymentEvent],
        asOfDate: '2026-10-30',
      });

      // Period 0 must exist
      const period0 = result.schedule[0];
      expect(period0).toBeDefined();
      expect(period0!.periodNumber).toBe(0);
      expect(period0!.interest).toBe(402700); // Exactly ₹4,027 in paise
      expect(period0!.totalPayment).toBe(402700);
      expect(period0!.status).toBe('ACTUAL');
      expect(period0!.eventIds).toContain('bp-event-4027');

      // KPIs must include ₹4,027 in actual interest paid
      expect(result.kpis.actualInterestPaid).toBe(402700);
      expect(result.kpis.actualTotalPaid).toBe(402700);
      expect(result.kpis.currentOutstandingPrincipal).toBe(loan.originalPrincipal);
    });

    it('works when loan did not have broken period explicitly configured but user paid broken period interest', () => {
      const loanNoBpConfig: Loan = {
        ...loan,
        brokenPeriod: undefined,
      };

      const bpPaymentEvent: LoanEvent = {
        id: 'bp-event-adhoc',
        loanId: loan.id,
        date: '2026-10-01',
        type: 'BROKEN_PERIOD_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(4027),
        interestComponent: rupeesToPaise(4027),
        principalComponent: 0,
        source: 'USER_ENTERED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = generateAmortizationSchedule(loanNoBpConfig, {
        events: [bpPaymentEvent],
      });

      // Schedule creates Period 0 for the broken period payment
      expect(result.schedule[0]!.periodNumber).toBe(0);
      expect(result.schedule[0]!.interest).toBe(402700);
      expect(result.schedule[0]!.status).toBe('ACTUAL');
      expect(result.kpis.actualInterestPaid).toBe(402700);
    });
  });

  describe('12. Realized Interest Saved Till Today (vs Original Baseline Schedule)', () => {
    const loan: Loan = {
      id: 'test-loan-savings',
      name: 'Home Loan for Savings Test',
      currency: 'INR',
      originalPrincipal: rupeesToPaise(5000000), // ₹50 Lakhs
      annualInterestRate: 8.5,
      originalTenureMonths: 240,
      startDate: '2026-09-15',
      firstEmiDate: '2026-11-05',
      repaymentFrequency: 'MONTHLY',
      repaymentMode: 'REDUCE_TENURE',
      interestMethod: 'MONTHLY_REDUCING_BALANCE',
      brokenPeriod: {
        startDate: '2026-09-15',
        endDate: '2026-11-05',
        treatment: 'INTEREST_ONLY',
        dayCount: 'ACTUAL_365',
      },
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('reports zero realized savings when no part-payments have occurred', () => {
      // 3 months elapsed
      const result = generateAmortizationSchedule(loan, {
        asOfDate: '2027-01-05',
      });

      expect(result.kpis.baselineInterestToDate).toBeGreaterThan(0);
      expect(result.kpis.actualInterestPaid).toBe(result.kpis.baselineInterestToDate);
      expect(result.kpis.realizedInterestSaving).toBe(0);
      expect(result.kpis.realizedInterestSavingPercentage).toBe(0);
    });

    it('correctly calculates realized interest saved till today when part-payments are made', () => {
      // Borrower makes a ₹5,00,000 part-payment in Month 1 (2026-11-05)
      const partPaymentEvent: LoanEvent = {
        id: 'pp-month-1',
        loanId: loan.id,
        date: '2026-11-05',
        type: 'PART_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(500000), // ₹5,00,000
        source: 'USER_ENTERED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // As of Month 3 (2027-01-05)
      const result = generateAmortizationSchedule(loan, {
        events: [partPaymentEvent],
        asOfDate: '2027-01-05',
      });

      // Month 1 interest was same (opening balance ₹50L).
      // Prepayment of ₹5L reduced Month 2 opening balance by ₹5L.
      // Month 2 interest is lower than baseline Month 2 interest.
      // Month 3 interest is also lower than baseline Month 3 interest.
      expect(result.kpis.actualInterestPaid).toBeLessThan(result.kpis.baselineInterestToDate);
      expect(result.kpis.realizedInterestSaving).toBe(
        result.kpis.baselineInterestToDate - result.kpis.actualInterestPaid,
      );
      expect(result.kpis.realizedInterestSaving).toBeGreaterThan(0);

      // Percentage check: ((baseline - actual) / baseline) * 100 rounded to 1 decimal
      const expectedPercentage =
        Math.round(
          ((result.kpis.baselineInterestToDate - result.kpis.actualInterestPaid) /
            result.kpis.baselineInterestToDate) *
            1000,
        ) / 10;
      expect(result.kpis.realizedInterestSavingPercentage).toBe(expectedPercentage);
      expect(result.kpis.realizedInterestSavingPercentage).toBeGreaterThan(0);

      // Verify row-by-row interest difference matches realizedInterestSaving
      const actualRows = result.schedule.filter((r) => r.status === 'ACTUAL');
      const baselineRows = result.baselineSchedule.filter((r) => r.periodNumber <= 3);
      const rowByRowSavings = baselineRows.reduce((sum, bRow) => {
        const aRow = actualRows.find((r) => r.periodNumber === bRow.periodNumber);
        return sum + (bRow.interest - (aRow?.interest ?? 0));
      }, 0);
      expect(result.kpis.realizedInterestSaving).toBe(rowByRowSavings);
    });

    it('preserves exact baseline interest comparison when broken period interest is paid', () => {
      const bpPaymentEvent: LoanEvent = {
        id: 'bp-event-4027',
        loanId: loan.id,
        date: '2026-10-15',
        type: 'BROKEN_PERIOD_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(4027),
        interestComponent: rupeesToPaise(4027),
        principalComponent: 0,
        source: 'USER_ENTERED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = generateAmortizationSchedule(loan, {
        events: [bpPaymentEvent],
        asOfDate: '2026-10-20', // before first EMI
      });

      // Both baseline and actual include broken period interest of ₹4,027
      expect(result.kpis.actualInterestPaid).toBe(402700);
      expect(result.kpis.baselineInterestToDate).toBe(402700);
      expect(result.kpis.realizedInterestSaving).toBe(0);
    });

    it('isolates savingsFromActualPrepayments when future recurring rules are present', () => {
      // Borrower has paid a ₹2,00,000 prepayment on 2026-11-05
      const actualPayment: LoanEvent = {
        id: 'pp-actual-1',
        loanId: loan.id,
        date: '2026-11-05',
        type: 'PART_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(200000), // ₹2 Lakhs
        source: 'USER_ENTERED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Borrower also has a recurring rule of ₹25,000/month starting in 2027
      const futureRule: PartPaymentRule = {
        id: 'rule-future-1',
        loanId: loan.id,
        startDate: '2027-01-05',
        frequency: 'MONTHLY',
        amountType: 'FIXED',
        amount: rupeesToPaise(25000),
        treatment: 'REDUCE_TENURE',
        status: 'ACTIVE',
        createdAt: '',
        updatedAt: '',
      };

      const result = generateAmortizationSchedule(loan, {
        events: [actualPayment],
        rules: [futureRule],
        asOfDate: '2026-11-10',
      });

      // projectedInterestSaving includes future rules
      expect(result.kpis.projectedInterestSaving).toBeGreaterThan(0);

      // savingsFromActualPrepayments strictly reflects what the ₹2,00,000 paid to date saves
      expect(result.kpis.savingsFromActualPrepayments).toBeGreaterThan(0);
      expect(result.kpis.savingsFromActualPrepayments).toBeLessThan(
        result.kpis.projectedInterestSaving,
      );
      expect(result.kpis.actualPartPaymentsPaid).toBe(rupeesToPaise(200000));
    });

    it('matches and applies prepayments made before firstEmiDate to period 1', () => {
      // Prepayment made on 2026-10-15 (between disbursement Sep 15 and first EMI Nov 5)
      const earlyPrepayment: LoanEvent = {
        id: 'pp-early-oct',
        loanId: loan.id,
        date: '2026-10-15',
        type: 'PART_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(100000), // ₹1 Lakh
        source: 'USER_ENTERED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = generateAmortizationSchedule(loan, {
        events: [earlyPrepayment],
        asOfDate: '2026-11-10',
      });

      // Period 1 must capture the early prepayment
      const period1 = result.schedule.find((r) => r.periodNumber === 1);
      expect(period1).toBeDefined();
      expect(period1!.partPayment).toBe(rupeesToPaise(100000));
      expect(result.kpis.actualPartPaymentsPaid).toBe(rupeesToPaise(100000));
      expect(result.kpis.savingsFromActualPrepayments).toBeGreaterThan(0);
    });
  });
});

