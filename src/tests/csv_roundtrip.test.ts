import { describe, it, expect } from 'vitest';
import { serializeToCsv, parseAndValidateCsv, ExportDataPayload } from '../services/csv';
import { rupeesToPaise } from '../domain/loan/money';

describe('CSV Serialization & Import Contract', () => {
  const sampleData: ExportDataPayload = {
    loans: [
      {
        id: 'loan-csv-1',
        name: 'Home Loan (Main, "Prime" & 1st)', // commas and quotes in description
        currency: 'INR',
        originalPrincipal: rupeesToPaise(5000000),
        annualInterestRate: 8.75,
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
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
        notes: 'Loan with special ₹ symbol and\nmultiline notes',
      },
    ],
    events: [
      {
        id: 'event-csv-1',
        loanId: 'loan-csv-1',
        date: '2026-11-05',
        type: 'EMI',
        status: 'ACTUAL',
        amount: rupeesToPaise(44186),
        principalComponent: rupeesToPaise(7727),
        interestComponent: rupeesToPaise(36459),
        source: 'USER_ENTERED',
        notes: 'First EMI payment, verified on bank statement',
        createdAt: '2026-11-05T10:00:00.000Z',
        updatedAt: '2026-11-05T10:00:00.000Z',
      },
      {
        id: 'event-csv-2',
        loanId: 'loan-csv-1',
        date: '2026-12-15',
        type: 'PART_PAYMENT',
        status: 'ACTUAL',
        amount: rupeesToPaise(100000),
        source: 'USER_ENTERED',
        notes: 'Bonus part payment ₹1,00,000',
        createdAt: '2026-12-15T10:00:00.000Z',
        updatedAt: '2026-12-15T10:00:00.000Z',
      },
    ],
    rules: [
      {
        id: 'rule-csv-1',
        loanId: 'loan-csv-1',
        startDate: '2027-01-05',
        endDate: '2029-12-05',
        frequency: 'MONTHLY',
        amountType: 'FIXED',
        amount: rupeesToPaise(25000),
        treatment: 'REDUCE_TENURE',
        status: 'ACTIVE',
        notes: 'Planned ₹25k monthly',
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
      },
    ],
    overrides: [
      {
        id: 'ov-csv-1',
        loanId: 'loan-csv-1',
        date: '2027-03-05',
        amount: rupeesToPaise(50000),
        cancelled: false,
        notes: 'Higher prepayment in March',
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
      },
    ],
    scenarios: [
      {
        id: 'scen-csv-1',
        loanId: 'loan-csv-1',
        name: 'Aggressive Repayment Scenario',
        description: 'Extra ₹50,000 monthly',
        additionalMonthlyPayment: rupeesToPaise(50000),
        oneTimePayments: [],
        repaymentMode: 'REDUCE_TENURE',
        createdAt: '2026-09-15T10:00:00.000Z',
        updatedAt: '2026-09-15T10:00:00.000Z',
      },
    ],
  };

  it('performs lossless export -> import roundtrip', () => {
    const csvString = serializeToCsv(sampleData);
    expect(csvString).toContain('schemaVersion,recordType,loanId');

    const importResult = parseAndValidateCsv(csvString);
    expect(importResult.success).toBe(true);
    expect(importResult.errors.length).toBe(0);
    expect(importResult.summary.loansCount).toBe(1);
    expect(importResult.summary.eventsCount).toBe(2);
    expect(importResult.summary.rulesCount).toBe(1);
    expect(importResult.summary.overridesCount).toBe(1);
    expect(importResult.summary.scenariosCount).toBe(1);

    const importedLoan = importResult.data?.loans[0];
    expect(importedLoan).toBeDefined();
    expect(importedLoan?.id).toBe(sampleData.loans[0]!.id);
    expect(importedLoan?.originalPrincipal).toBe(sampleData.loans[0]!.originalPrincipal);
    expect(importedLoan?.annualInterestRate).toBe(sampleData.loans[0]!.annualInterestRate);
    expect(importedLoan?.name).toBe(sampleData.loans[0]!.name);
    expect(importedLoan?.brokenPeriod?.treatment).toBe('INTEREST_ONLY');
  });

  it('rejects empty or corrupt CSV with clear errors', () => {
    const emptyResult = parseAndValidateCsv('');
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.errors.length).toBeGreaterThan(0);

    const corruptResult = parseAndValidateCsv('random,garbage,header\n1,2,3');
    expect(corruptResult.success).toBe(false);
    expect(corruptResult.errors.some((e) => e.includes('Missing required column'))).toBe(true);
  });
});
