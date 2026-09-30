import {
  LocalDate,
  Money,
  PartPaymentOverride,
  PartPaymentRule,
  LoanEvent,
  RepaymentMode,
} from './types';
import { roundHalfUp } from './money';
import { isSameOrAfter, isSameOrBefore, parseLocalDateParts, compareDates } from './dates';

export interface ResolvedPartPayment {
  amount: Money;
  source: 'NONE' | 'RECURRING_RULE' | 'ONE_TIME' | 'OVERRIDE' | 'CANCELLED';
  treatment: RepaymentMode;
  ruleId?: string;
  overrideId?: string;
  eventIds?: string[];
}

/**
 * Checks if a target date matches the recurrence pattern of a rule.
 */
export function isDateMatchingRule(
  rule: PartPaymentRule,
  targetDate: LocalDate,
): boolean {
  if (rule.status === 'CANCELLED') return false;
  if (!isSameOrAfter(targetDate, rule.startDate)) return false;
  if (rule.endDate && !isSameOrBefore(targetDate, rule.endDate)) return false;

  const [ruleY, ruleM] = parseLocalDateParts(rule.startDate);
  const [targetY, targetM] = parseLocalDateParts(targetDate);
  const monthDiff = (targetY - ruleY) * 12 + (targetM - ruleM);

  if (monthDiff < 0) return false;

  switch (rule.frequency) {
    case 'MONTHLY':
      return true;
    case 'QUARTERLY':
      return monthDiff % 3 === 0;
    case 'YEARLY':
      return monthDiff % 12 === 0;
    default:
      return false;
  }
}

/**
 * Resolves the effective part-payment amount and metadata for a specific period/date.
 *
 * Enforces strict precedence:
 * 1. Explicit cancellation (override with cancelled: true -> 0)
 * 2. Explicit monthly override
 * 3. One-time ad-hoc payments (sum of all one-time part-payment events on this date)
 * 4. Active recurring rule
 * 5. No payment (0)
 */
export function resolveEffectivePartPayment(
  targetDate: LocalDate,
  openingBalancePaise: Money,
  rules: PartPaymentRule[],
  overrides: PartPaymentOverride[],
  oneTimeEvents: LoanEvent[],
  defaultTreatment: RepaymentMode,
  isFirstPeriod: boolean = false,
  claimedEventIds?: Set<string>,
): ResolvedPartPayment {
  // 1. Check for overrides on this date (month-year or exact date match)
  const [ty, tm] = parseLocalDateParts(targetDate);
  const targetMonthPrefix = `${String(ty).padStart(4, '0')}-${String(tm).padStart(2, '0')}`;

  const matchingOverride = overrides.find((o) => {
    return o.date === targetDate || o.date.startsWith(targetMonthPrefix);
  });

  if (matchingOverride) {
    if (matchingOverride.cancelled) {
      return {
        amount: 0,
        source: 'CANCELLED',
        treatment: defaultTreatment,
        overrideId: matchingOverride.id,
      };
    }
    return {
      amount: matchingOverride.amount,
      source: 'OVERRIDE',
      treatment: defaultTreatment,
      overrideId: matchingOverride.id,
    };
  }

  // 2. Check for one-time payments on this date or prior to first EMI
  const matchingEvents = oneTimeEvents.filter((e) => {
    if (e.type !== 'PART_PAYMENT' || e.status === 'CANCELLED') return false;
    if (claimedEventIds?.has(e.id)) return false;
    if (e.date === targetDate || e.date.startsWith(targetMonthPrefix)) return true;
    if (isFirstPeriod && compareDates(e.date, targetDate) <= 0) return true;
    return false;
  });

  if (matchingEvents.length > 0) {
    const totalAmount = matchingEvents.reduce((acc, ev) => acc + ev.amount, 0);
    return {
      amount: totalAmount,
      source: 'ONE_TIME',
      treatment: defaultTreatment,
      eventIds: matchingEvents.map((e) => e.id),
    };
  }

  // 3. Check for matching active recurring rules
  const matchingRule = rules.find((r) => isDateMatchingRule(r, targetDate));

  if (matchingRule) {
    let calculatedAmount: Money = 0;
    if (matchingRule.amountType === 'PERCENTAGE') {
      // Percentage of current opening balance
      calculatedAmount = roundHalfUp((openingBalancePaise * matchingRule.amount) / 100);
    } else {
      calculatedAmount = matchingRule.amount;
    }

    return {
      amount: calculatedAmount,
      source: 'RECURRING_RULE',
      treatment: matchingRule.treatment ?? defaultTreatment,
      ruleId: matchingRule.id,
    };
  }

  // 4. Default: No part-payment
  return {
    amount: 0,
    source: 'NONE',
    treatment: defaultTreatment,
  };
}

