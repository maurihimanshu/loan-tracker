import { BrokenPeriodConfig, Money, Percentage } from './types';
import { roundHalfUp } from './money';
import { daysBetween } from './dates';

export interface BrokenPeriodCalculationResult {
  days: number;
  interest: Money;
  principal: Money;
  totalPayment: Money;
  capitalizedAmount: Money;
  startingSchedulePrincipal: Money; // Principal to begin the regular EMI schedule with
}

/**
 * Calculates broken period interest and resulting loan principal adjustment.
 *
 * Days = daysBetween(startDate, endDate)
 * Interest = roundHalfUp(Principal * (annualRate / 100) * (days / 365))
 */
export function calculateBrokenPeriod(
  originalPrincipalPaise: Money,
  annualRate: Percentage,
  config?: BrokenPeriodConfig,
): BrokenPeriodCalculationResult {
  if (!config) {
    return {
      days: 0,
      interest: 0,
      principal: 0,
      totalPayment: 0,
      capitalizedAmount: 0,
      startingSchedulePrincipal: originalPrincipalPaise,
    };
  }

  const days = Math.max(0, daysBetween(config.startDate, config.endDate));
  if (days === 0) {
    return {
      days: 0,
      interest: 0,
      principal: 0,
      totalPayment: 0,
      capitalizedAmount: 0,
      startingSchedulePrincipal: originalPrincipalPaise,
    };
  }

  // Model-calculated interest for broken period using Actual/365
  const modeledInterest =
    annualRate > 0
      ? roundHalfUp((originalPrincipalPaise * (annualRate / 100) * days) / 365)
      : 0;

  switch (config.treatment) {
    case 'USER_ENTERED': {
      const interest = config.customInterest ?? modeledInterest;
      const principal = config.customPrincipal ?? 0;
      const total = config.customTotal ?? interest + principal;
      return {
        days,
        interest,
        principal,
        totalPayment: total,
        capitalizedAmount: 0,
        startingSchedulePrincipal: Math.max(0, originalPrincipalPaise - principal),
      };
    }

    case 'CAPITALIZE_INTEREST': {
      return {
        days,
        interest: modeledInterest,
        principal: 0,
        totalPayment: 0, // No payment made by borrower upfront; capitalized
        capitalizedAmount: modeledInterest,
        startingSchedulePrincipal: originalPrincipalPaise + modeledInterest,
      };
    }

    case 'INTEREST_PLUS_PRINCIPAL': {
      const userPrincipal = config.customPrincipal ?? 0;
      const interest = config.customInterest ?? modeledInterest;
      return {
        days,
        interest,
        principal: userPrincipal,
        totalPayment: interest + userPrincipal,
        capitalizedAmount: 0,
        startingSchedulePrincipal: Math.max(0, originalPrincipalPaise - userPrincipal),
      };
    }

    case 'INTEREST_ONLY':
    default: {
      return {
        days,
        interest: modeledInterest,
        principal: 0,
        totalPayment: modeledInterest,
        capitalizedAmount: 0,
        startingSchedulePrincipal: originalPrincipalPaise,
      };
    }
  }
}

