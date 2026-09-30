import { Money } from './types';

/**
 * Deterministic HALF_UP rounding for monetary calculation.
 * Ensures 1.235 -> 1.24 and avoids binary floating point rounding bugs.
 */
export function roundHalfUp(val: number): number {
  const sign = val < 0 ? -1 : 1;
  const abs = Math.abs(val);
  // Add small epsilon to handle precision artifacts like 1.005 * 100 = 100.49999999999999
  return sign * Math.floor(abs + 0.5 + Number.EPSILON);
}

/**
 * Converts a rupee amount (decimal) into integer paise (minor units).
 * E.g. 1000.50 -> 100050 paise.
 */
export function rupeesToPaise(rupees: number): Money {
  if (isNaN(rupees) || !isFinite(rupees)) {
    return 0;
  }
  return roundHalfUp(rupees * 100);
}

/**
 * Converts integer paise into rupees (decimal).
 * E.g. 100050 paise -> 1000.50.
 */
export function paiseToRupees(paise: Money): number {
  return paise / 100;
}

/**
 * Formats paise as an Indian Rupee string using Intl.NumberFormat.
 * E.g. 124500000 paise -> "₹12,45,000.00" or "₹12,45,000".
 */
export function formatINR(paise: Money, showDecimals: boolean = false): string {
  const rupees = paiseToRupees(paise);
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return formatter.format(rupees);
}

/**
 * Formats a percentage number with 2 decimal places.
 * E.g. 8.5 -> "8.50%".
 */
export function formatPercentage(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

/**
 * Cleans user string input and parses it into a valid positive number.
 * Handles commas, rupee symbols, spaces.
 */
export function parseFinancialInput(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[₹,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Compact Indian numbering format for charts and KPI cards (e.g. ₹12.5L, ₹2.3Cr, ₹45K)
 */
export function formatCompactINR(paise: Money): string {
  const rupees = Math.abs(paiseToRupees(paise));
  const sign = paise < 0 ? '-' : '';
  if (rupees >= 10000000) {
    return `${sign}₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (rupees >= 100000) {
    return `${sign}₹${(rupees / 100000).toFixed(2)} L`;
  }
  if (rupees >= 1000) {
    return `${sign}₹${(rupees / 1000).toFixed(1)} K`;
  }
  return `${sign}₹${rupees.toFixed(0)}`;
}

