import { describe, expect, it } from 'vitest';
import { basisPointsToPercent, parseHundredths, percentToBasisPoints } from './money';

describe('parseHundredths', () => {
  it.each([
    ['1250.50', 125050],
    ['1250.5', 125050],
    ['1250', 125000],
    ['0.01', 1],
    ['0', 0],
    ['  42  ', 4200],
    ['1000000', 100000000],
    ['007.10', 710],
  ])('parses %j as %i hundredths', (input, expected) => {
    expect(parseHundredths(input)).toEqual({ kind: 'ok', value: expected });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['-5', 'negative'],
    ['-0.50', 'negative'],
    ['1.234', 'too-many-decimals'],
    ['abc', 'invalid'],
    ['1,250', 'invalid'],
    ['1e3', 'invalid'],
    ['.5', 'invalid'],
    ['5.', 'invalid'],
    ['+5', 'invalid'],
    ['- abc', 'invalid'],
    ['1234567890123456', 'too-large'],
  ])('classifies %j as %s', (input, kind) => {
    expect(parseHundredths(input).kind).toBe(kind);
  });
});

describe('percentages as basis points', () => {
  it('converts the sample data percentages exactly', () => {
    expect(percentToBasisPoints(33.33)).toBe(3333);
    expect(percentToBasisPoints(33.34)).toBe(3334);
    expect(percentToBasisPoints(50)).toBe(5000);
    expect(percentToBasisPoints(0)).toBe(0);
  });

  it('rejects values that are not 0+ with at most 2 decimals', () => {
    expect(percentToBasisPoints(33.333)).toBeNull();
    expect(percentToBasisPoints(-1)).toBeNull();
    expect(percentToBasisPoints(Number.NaN)).toBeNull();
    expect(percentToBasisPoints(1e-7)).toBeNull();
  });

  it('round-trips every value from 0% to 100% in 0.01% steps', () => {
    for (let bp = 0; bp <= 10_000; bp += 1) {
      expect(percentToBasisPoints(basisPointsToPercent(bp))).toBe(bp);
    }
  });
});
