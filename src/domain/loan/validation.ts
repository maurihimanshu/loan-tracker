import { z } from 'zod';
import { isValidLocalDate, isBefore } from './dates';

export const loanFormSchema = z
  .object({
    name: z.string().min(1, 'Loan name is required').max(100),
    originalPrincipal: z.coerce
      .number()
      .positive('Principal must be greater than 0')
      .max(1000000000, 'Principal exceeds maximum allowed'),
    annualInterestRate: z.coerce
      .number()
      .min(0, 'Interest rate cannot be negative')
      .max(100, 'Interest rate cannot exceed 100%'),
    originalTenureMonths: z.coerce
      .number()
      .int('Tenure must be an integer')
      .min(1, 'Tenure must be at least 1 month')
      .max(600, 'Tenure cannot exceed 600 months (50 years)'),
    startDate: z
      .string()
      .refine(isValidLocalDate, 'Start date must be a valid YYYY-MM-DD date'),
    firstEmiDate: z
      .string()
      .refine(isValidLocalDate, 'First EMI date must be a valid YYYY-MM-DD date'),
    repaymentMode: z.enum(['REDUCE_TENURE', 'REDUCE_EMI']),
    enableBrokenPeriod: z.boolean().default(false),
    brokenPeriodTreatment: z
      .enum([
        'INTEREST_ONLY',
        'INTEREST_PLUS_PRINCIPAL',
        'CAPITALIZE_INTEREST',
        'USER_ENTERED',
      ])
      .default('INTEREST_ONLY'),
    brokenPeriodCustomInterest: z.coerce.number().min(0).optional(),
    brokenPeriodCustomPrincipal: z.coerce.number().min(0).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      return !isBefore(data.firstEmiDate, data.startDate);
    },
    {
      message: 'First EMI date cannot be earlier than loan disbursement start date',
      path: ['firstEmiDate'],
    },
  );

export type LoanFormValues = z.infer<typeof loanFormSchema>;

export const partPaymentRuleSchema = z
  .object({
    frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
    amountType: z.enum(['FIXED', 'PERCENTAGE']),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    startDate: z
      .string()
      .refine(isValidLocalDate, 'Start date must be a valid YYYY-MM-DD date'),
    endDate: z
      .string()
      .refine((d) => !d || isValidLocalDate(d), 'End date must be valid')
      .optional()
      .or(z.literal('')),
    treatment: z.enum(['REDUCE_TENURE', 'REDUCE_EMI']),
    notes: z.string().max(300).optional(),
  })
  .refine(
    (data) => {
      if (data.amountType === 'PERCENTAGE' && data.amount > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage cannot exceed 100%',
      path: ['amount'],
    },
  )
  .refine(
    (data) => {
      if (data.endDate && data.endDate.trim() !== '') {
        return !isBefore(data.endDate, data.startDate);
      }
      return true;
    },
    {
      message: 'End date cannot be earlier than start date',
      path: ['endDate'],
    },
  );

export type PartPaymentRuleFormValues = z.infer<typeof partPaymentRuleSchema>;

export const overrideFormSchema = z.object({
  date: z
    .string()
    .refine(isValidLocalDate, 'Date must be a valid YYYY-MM-DD date'),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  cancelled: z.boolean().default(false),
  notes: z.string().max(300).optional(),
});

export type OverrideFormValues = z.infer<typeof overrideFormSchema>;

export const scenarioFormSchema = z.object({
  name: z.string().min(1, 'Scenario name is required').max(100),
  description: z.string().max(300).optional(),
  additionalMonthlyPayment: z.coerce
    .number()
    .min(0, 'Payment cannot be negative')
    .default(0),
  repaymentMode: z.enum(['REDUCE_TENURE', 'REDUCE_EMI']).default('REDUCE_TENURE'),
  startDate: z
    .string()
    .refine((d) => !d || isValidLocalDate(d), 'Start date must be valid')
    .optional()
    .or(z.literal('')),
  endDate: z
    .string()
    .refine((d) => !d || isValidLocalDate(d), 'End date must be valid')
    .optional()
    .or(z.literal('')),
});

export type ScenarioFormValues = z.infer<typeof scenarioFormSchema>;

