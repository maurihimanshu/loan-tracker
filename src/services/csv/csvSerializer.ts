import {
  Loan,
  LoanEvent,
  PartPaymentOverride,
  PartPaymentRule,
  Scenario,
} from '../../domain/loan/types';
import { paiseToRupees } from '../../domain/loan/money';

export const CSV_SCHEMA_VERSION = 1;

export interface CsvRecord {
  schemaVersion: number;
  recordType:
    | 'LOAN'
    | 'PAYMENT'
    | 'PART_PAYMENT'
    | 'PART_PAYMENT_RULE'
    | 'PART_PAYMENT_OVERRIDE'
    | 'SCENARIO'
    | 'SCENARIO_PAYMENT'
    | 'BROKEN_PERIOD';
  loanId: string;
  entityId: string;
  date: string;
  amount: string;
  principal: string;
  interest: string;
  status: string;
  frequency: string;
  amountType: string;
  treatment: string;
  description: string;
  metadata: string;
}

export const CSV_HEADERS: (keyof CsvRecord)[] = [
  'schemaVersion',
  'recordType',
  'loanId',
  'entityId',
  'date',
  'amount',
  'principal',
  'interest',
  'status',
  'frequency',
  'amountType',
  'treatment',
  'description',
  'metadata',
];

/**
 * Escapes a cell according to RFC 4180.
 */
export function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportDataPayload {
  loans: Loan[];
  events: LoanEvent[];
  rules: PartPaymentRule[];
  overrides: PartPaymentOverride[];
  scenarios: Scenario[];
}

/**
 * Converts domain entities into versioned CSV string with explicit column ordering.
 */
export function serializeToCsv(data: ExportDataPayload): string {
  const records: CsvRecord[] = [];

  // 1. Serialize Loans
  for (const loan of data.loans) {
    records.push({
      schemaVersion: CSV_SCHEMA_VERSION,
      recordType: 'LOAN',
      loanId: loan.id,
      entityId: loan.id,
      date: loan.startDate,
      amount: paiseToRupees(loan.originalPrincipal).toFixed(2),
      principal: paiseToRupees(loan.originalPrincipal).toFixed(2),
      interest: loan.annualInterestRate.toString(),
      status: loan.status,
      frequency: loan.repaymentFrequency,
      amountType: 'FIXED',
      treatment: loan.repaymentMode,
      description: loan.name,
      metadata: JSON.stringify({
        firstEmiDate: loan.firstEmiDate,
        originalTenureMonths: loan.originalTenureMonths,
        interestMethod: loan.interestMethod,
        currency: loan.currency,
        notes: loan.notes,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
      }),
    });

    // Broken period if configured
    if (loan.brokenPeriod) {
      records.push({
        schemaVersion: CSV_SCHEMA_VERSION,
        recordType: 'BROKEN_PERIOD',
        loanId: loan.id,
        entityId: `bp-${loan.id}`,
        date: loan.brokenPeriod.startDate,
        amount: loan.brokenPeriod.customTotal
          ? paiseToRupees(loan.brokenPeriod.customTotal).toFixed(2)
          : '',
        principal: loan.brokenPeriod.customPrincipal
          ? paiseToRupees(loan.brokenPeriod.customPrincipal).toFixed(2)
          : '',
        interest: loan.brokenPeriod.customInterest
          ? paiseToRupees(loan.brokenPeriod.customInterest).toFixed(2)
          : '',
        status: 'ACTIVE',
        frequency: '',
        amountType: '',
        treatment: loan.brokenPeriod.treatment,
        description: 'Broken Period Configuration',
        metadata: JSON.stringify({
          endDate: loan.brokenPeriod.endDate,
          dayCount: loan.brokenPeriod.dayCount,
        }),
      });
    }
  }

  // 2. Serialize Events
  for (const ev of data.events) {
    records.push({
      schemaVersion: CSV_SCHEMA_VERSION,
      recordType: ev.type === 'PART_PAYMENT' ? 'PART_PAYMENT' : 'PAYMENT',
      loanId: ev.loanId,
      entityId: ev.id,
      date: ev.date,
      amount: paiseToRupees(ev.amount).toFixed(2),
      principal: ev.principalComponent ? paiseToRupees(ev.principalComponent).toFixed(2) : '',
      interest: ev.interestComponent ? paiseToRupees(ev.interestComponent).toFixed(2) : '',
      status: ev.status,
      frequency: '',
      amountType: 'FIXED',
      treatment: '',
      description: ev.notes ?? '',
      metadata: JSON.stringify({
        type: ev.type,
        source: ev.source,
        feeComponent: ev.feeComponent,
        createdAt: ev.createdAt,
        updatedAt: ev.updatedAt,
      }),
    });
  }

  // 3. Serialize Part Payment Rules
  for (const rule of data.rules) {
    const amountStr =
      rule.amountType === 'PERCENTAGE'
        ? rule.amount.toString()
        : paiseToRupees(rule.amount).toFixed(2);

    records.push({
      schemaVersion: CSV_SCHEMA_VERSION,
      recordType: 'PART_PAYMENT_RULE',
      loanId: rule.loanId,
      entityId: rule.id,
      date: rule.startDate,
      amount: amountStr,
      principal: '',
      interest: '',
      status: rule.status,
      frequency: rule.frequency,
      amountType: rule.amountType,
      treatment: rule.treatment,
      description: rule.notes ?? '',
      metadata: JSON.stringify({
        endDate: rule.endDate,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }),
    });
  }

  // 4. Serialize Part Payment Overrides
  for (const ov of data.overrides) {
    records.push({
      schemaVersion: CSV_SCHEMA_VERSION,
      recordType: 'PART_PAYMENT_OVERRIDE',
      loanId: ov.loanId,
      entityId: ov.id,
      date: ov.date,
      amount: paiseToRupees(ov.amount).toFixed(2),
      principal: '',
      interest: '',
      status: ov.cancelled ? 'CANCELLED' : 'ACTIVE',
      frequency: '',
      amountType: 'FIXED',
      treatment: '',
      description: ov.notes ?? '',
      metadata: JSON.stringify({
        cancelled: ov.cancelled,
        createdAt: ov.createdAt,
        updatedAt: ov.updatedAt,
      }),
    });
  }

  // 5. Serialize Scenarios
  for (const scen of data.scenarios) {
    records.push({
      schemaVersion: CSV_SCHEMA_VERSION,
      recordType: 'SCENARIO',
      loanId: scen.loanId,
      entityId: scen.id,
      date: scen.startDate ?? '',
      amount: paiseToRupees(scen.additionalMonthlyPayment).toFixed(2),
      principal: '',
      interest: '',
      status: 'ACTIVE',
      frequency: 'MONTHLY',
      amountType: 'FIXED',
      treatment: scen.repaymentMode,
      description: scen.name,
      metadata: JSON.stringify({
        description: scen.description,
        endDate: scen.endDate,
        oneTimePayments: scen.oneTimePayments,
        createdAt: scen.createdAt,
        updatedAt: scen.updatedAt,
      }),
    });
  }

  // Construct CSV text
  const headerLine = CSV_HEADERS.join(',');
  const rowLines = records.map((rec) =>
    CSV_HEADERS.map((header) => escapeCsvField(rec[header])).join(','),
  );

  return [headerLine, ...rowLines].join('\r\n');
}
