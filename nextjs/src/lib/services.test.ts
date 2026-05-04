import { describe, it, expect } from 'vitest';
import { calcTotal, formatUSDPrice } from './services';

// ---------------------------------------------------------------------------
// calcTotal
// ---------------------------------------------------------------------------

describe('calcTotal', () => {
  it('returns 0 for an empty record', () => {
    expect(calcTotal({})).toBe(0);
  });

  it('sums valid numeric strings', () => {
    expect(calcTotal({ a: '100', b: '250.50', c: '49.50' })).toBeCloseTo(400);
  });

  it('treats non-numeric strings as zero', () => {
    expect(calcTotal({ a: '100', b: 'abc' })).toBe(100);
  });

  it('treats empty string as zero', () => {
    expect(calcTotal({ a: '' })).toBe(0);
  });

  it('treats negative values as zero', () => {
    expect(calcTotal({ a: '-50', b: '200' })).toBe(200);
  });

  it('treats NaN as zero', () => {
    expect(calcTotal({ a: 'NaN', b: '75' })).toBe(75);
  });

  it('treats Infinity string as zero', () => {
    expect(calcTotal({ a: 'Infinity', b: '50' })).toBe(50);
  });

  it('handles single service with zero price', () => {
    expect(calcTotal({ svc: '0' })).toBe(0);
  });

  it('handles large realistic values', () => {
    // 85000 + 22000 + 18000 = 125000
    expect(
      calcTotal({ pool: '85000', kitchen: '22000', patio: '18000' }),
    ).toBeCloseTo(125000);
  });
});

// ---------------------------------------------------------------------------
// formatUSDPrice
// ---------------------------------------------------------------------------

describe('formatUSDPrice', () => {
  it('formats zero', () => {
    expect(formatUSDPrice(0)).toBe('$0.00');
  });

  it('formats a whole number', () => {
    expect(formatUSDPrice(85000)).toBe('$85,000.00');
  });

  it('formats a decimal value', () => {
    expect(formatUSDPrice(2500.5)).toBe('$2,500.50');
  });
});
