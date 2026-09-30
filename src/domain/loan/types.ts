/**
 * Authoritative Domain Types for Financial Calculations
 * Financial Calculation Contract Version 1.0
 */

export const FCC_VERSION = '1.0' as const;

/**
 * Money represented as integer paise (minor units) to prevent floating-point inaccuracies.
 * 1 Rupee = 100 Paise.
 * Example: ₹1,234.56 = 123456 paise.
 */
export type Money = number;

/**
 * Annual percentage rate stored as a decimal percentage.
 * Example: 8.5% is stored as 8.5 (not 0.085).
 */
export type Percentage = number;

/**
 * Calendar date string formatted strictly as 'YYYY-MM-DD'.
 * Avoids any JavaScript Date timezone shift issues.
 */
export type LocalDate = string;

export type RepaymentFrequency = 'MONTHLY';

export type RepaymentMode = 'REDUCE_TENURE' | 'REDUCE_EMI';

export type InterestMethod = 'MONTHLY_REDUCING_BALANCE';

export type BrokenPeriodTreatment =
  | 'INTEREST_ONLY'
  | 'INTEREST_PLUS_PRINCIPAL'
  | 'CAPITALIZE_INTEREST'
  | 'USER_ENTERED';

export type DayCountConvention = 'ACTUAL_365';

export interface BrokenPeriodConfig {
  startDate: LocalDate;
  endDate: LocalDate;
  treatment: BrokenPeriodTreatment;
  dayCount: DayCountConvention;
  // For USER_ENTERED or explicitly recorded values
  customInterest?: Money;
  customPrincipal?: Money;
  customTotal?: Money;
}

export type LoanStatus = 'ACTIVE' | 'CLOSED';

export interface Loan {
  id: string;
  name: string;
  currency: 'INR';
  originalPrincipal: Money; // In paise
  annualInterestRate: Percentage; // E.g. 8.5
  originalTenureMonths: number;
  startDate: LocalDate; // Disbursement date
  firstEmiDate: LocalDate;
  repaymentFrequency: RepaymentFrequency;
  repaymentMode: RepaymentMode;
  interestMethod: InterestMethod;
  brokenPeriod?: BrokenPeriodConfig;
  status: LoanStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  notes?: string;
}

export type LoanEventType =
  | 'DISBURSEMENT'
  | 'EMI'
  | 'PART_PAYMENT'
  | 'RATE_CHANGE'
  | 'FEE'
  | 'BROKEN_PERIOD_PAYMENT'
  | 'MANUAL_ADJUSTMENT';

export type PaymentStatus = 'ACTUAL' | 'PLANNED' | 'PROJECTED' | 'CANCELLED';

export interface LoanEvent {
  id: string;
  loanId: string;
  date: LocalDate;
  type: LoanEventType;
  status: PaymentStatus;
  amount: Money; // In paise
  principalComponent?: Money;
  interestComponent?: Money;
  feeComponent?: Money;
  source: 'SYSTEM_GENERATED' | 'USER_ENTERED' | 'CSV_IMPORT' | 'RECURRING_RULE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PartPaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type PartPaymentAmountType = 'FIXED' | 'PERCENTAGE';

export interface PartPaymentRule {
  id: string;
  loanId: string;
  startDate: LocalDate;
  endDate?: LocalDate;
  frequency: PartPaymentFrequency;
  amountType: PartPaymentAmountType;
  amount: number; // In paise if FIXED, or percentage if PERCENTAGE (e.g. 10 for 10%)
  treatment: RepaymentMode;
  status: 'ACTIVE' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartPaymentOverride {
  id: string;
  loanId: string;
  date: LocalDate; // Month/date of the payment being overridden
  amount: Money; // In paise
  cancelled: boolean; // True if this month's part payment is cancelled (₹0)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AmortizationRow {
  periodNumber: number;
  date: LocalDate;
  openingBalance: Money;
  scheduledEmi: Money;
  interest: Money;
  scheduledPrincipal: Money;
  partPayment: Money;
  fees: Money;
  totalPayment: Money;
  closingBalance: Money;
  cumulativePrincipal: Money;
  cumulativeInterest: Money;
  cumulativePayment: Money;
  cumulativePartPayment: Money;
  status: 'ACTUAL' | 'PLANNED' | 'PROJECTED' | 'CLOSED';
  eventIds: string[];
}

export interface LoanKpis {
  originalPrincipal: Money;
  originalEmi: Money;
  originalTenureMonths: number;
  originalTotalInterest: Money;
  originalTotalPayment: Money;
  originalMaturityDate: LocalDate;

  currentOutstandingPrincipal: Money;
  currentEmi: Money;
  remainingTenureMonths: number;
  remainingInterest: Money;
  projectedMaturityDate: LocalDate;

  actualPrincipalPaid: Money;
  actualInterestPaid: Money;
  actualTotalPaid: Money;
  actualPartPaymentsPaid: Money;

  projectedTotalInterest: Money;
  projectedTotalPayment: Money;
  projectedTotalPartPayments: Money;

  // Explicit Savings definitions as per FCC & Master Build Prompt
  baselineInterestToDate: Money;
  baselinePrincipalToDate: Money;
  baselineTotalPaidToDate: Money;
  realizedInterestSaving: Money;
  realizedInterestSavingPercentage: number;
  savingsFromActualPrepayments: Money;
  tenureSavedFromActualPrepaymentsMonths: number;
  elapsedPeriodsCount: number;
  projectedInterestSaving: Money;
  realizedTenureSavedMonths: number;
  projectedTenureSavedMonths: number;
}

export interface CalculationResult {
  contractVersion: typeof FCC_VERSION;
  calculatedAt: string;
  loanId: string;
  baselineSchedule: AmortizationRow[];
  schedule: AmortizationRow[];
  kpis: LoanKpis;
  isClosed: boolean;
  closureDate?: LocalDate;
}

export interface ScenarioPayment {
  id: string;
  date: LocalDate;
  amount: Money;
}

export interface Scenario {
  id: string;
  loanId: string;
  name: string;
  description?: string;
  additionalMonthlyPayment: Money; // Additional monthly extra part-payment
  oneTimePayments: ScenarioPayment[];
  repaymentMode: RepaymentMode;
  startDate?: LocalDate;
  endDate?: LocalDate;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  startingBalance: Money;
  totalFuturePayments: Money;
  projectedInterest: Money;
  projectedPrincipal: Money;
  projectedClosureDate: LocalDate;
  remainingTenureMonths: number;
  interestSavedVsBaseline: Money;
  tenureSavedMonths: number;
  interestSavedVsCurrentProjection: Money;
  tenureSavedMonthsVsCurrentProjection: number;
  schedule: AmortizationRow[];
}

