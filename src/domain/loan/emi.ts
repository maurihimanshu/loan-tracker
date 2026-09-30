import { Money, Percentage } from './types';
import { roundHalfUp } from './money';

/**
 * Calculates standard Equated Monthly Installment (EMI) in integer paise.
 *
 * Formula:
 * P = principal (in paise)
 * r = annualRate / 12 / 100 (monthly nominal rate)
 * n = tenure in months
 *
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * If r == 0: EMI = P / n
 *
 * Returns EMI in integer paise, rounded HALF_UP.
 */
export function calculateStandardEmi(
  principalPaise: Money,
  annualRate: Percentage,
  tenureMonths: number,
): Money {
  if (tenureMonths <= 0 || principalPaise <= 0) {
    return 0;
  }

  if (annualRate <= 0) {
    return roundHalfUp(principalPaise / tenureMonths);
  }

  const r = annualRate / 12 / 100;
  const factor = Math.pow(1 + r, tenureMonths);
  const emiExact = (principalPaise * r * factor) / (factor - 1);

  return roundHalfUp(emiExact);
}

/**
 * Calculates interest for a regular monthly period on the opening principal.
 *
 * Interest = roundHalfUp(openingBalance * (annualRate / 12 / 100))
 */
export function calculateMonthlyInterest(
  openingBalancePaise: Money,
  annualRate: Percentage,
): Money {
  if (openingBalancePaise <= 0 || annualRate <= 0) {
    return 0;
  }
  const r = annualRate / 12 / 100;
  return roundHalfUp(openingBalancePaise * r);
}

