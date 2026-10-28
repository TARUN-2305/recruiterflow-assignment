// Strict parsing of "up to 2 decimals" numbers into integer hundredths, without floating point.
// Rupees -> paise and percent -> basis points are the same operation: 12.50 -> 1250.

import type { Paise } from './types';

/** ₹10,00,000.00 */
export const MAX_AMOUNT_PAISE: Paise = 100_000_000;
/** 100% in basis points (1% = 100 bp). */
export const FULL_PERCENT_BP = 10_000;

export type HundredthsParse =
  | { kind: 'ok'; value: number }
  | { kind: 'empty' }
  | { kind: 'negative' }
  | { kind: 'too-many-decimals' }
  | { kind: 'too-large' }
  | { kind: 'invalid' };

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;
// More than 15 integer digits could exceed Number.MAX_SAFE_INTEGER once multiplied by 100.
const MAX_INTEGER_DIGITS = 15;

/**
 * Parse text such as "1250.5" into hundredths (125050). Accepts digits with an optional
 * "." and 1-2 decimals; no signs, commas, spaces inside, or exponent notation.
 */
export function parseHundredths(input: string): HundredthsParse {
  const text = input.trim();
  if (text === '') return { kind: 'empty' };
  if (text.startsWith('-')) {
    return DECIMAL.test(text.slice(1).trim()) ? { kind: 'negative' } : { kind: 'invalid' };
  }

  const match = DECIMAL.exec(text);
  const whole = match?.[1];
  if (match === null || whole === undefined) return { kind: 'invalid' };
  const fraction = match[2] ?? '';
  if (fraction.length > 2) return { kind: 'too-many-decimals' };
  if (whole.replace(/^0+/, '').length > MAX_INTEGER_DIGITS) return { kind: 'too-large' };

  // Number() of a digit-only string is an exact integer here; no fractional arithmetic happens.
  return { kind: 'ok', value: Number(whole) * 100 + Number(fraction.padEnd(2, '0')) };
}

/**
 * Convert a stored percentage number (e.g. 33.33 from the JSON) to basis points (3333).
 * Uses the number's shortest decimal string, so 33.33 maps to exactly 3333.
 * Returns null for anything that is not a non-negative number with at most 2 decimals.
 */
export function percentToBasisPoints(percent: number): number | null {
  if (!Number.isFinite(percent) || percent < 0) return null;
  const parsed = parseHundredths(String(percent));
  return parsed.kind === 'ok' ? parsed.value : null;
}

/**
 * Basis points back to the brief's percent number (3333 -> 33.33) for storage only.
 * The division yields the double closest to the 2-decimal value, which round-trips exactly
 * through percentToBasisPoints (tested for every value 0..10000). It is never used in money maths.
 */
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}
