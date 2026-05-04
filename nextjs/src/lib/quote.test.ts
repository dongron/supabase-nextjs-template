import { describe, it, expect } from 'vitest';
import { normalizePrice, parseStoredQuote } from './quote';

describe('normalizePrice', () => {
  it('strips non-numeric characters from string', () => {
    expect(normalizePrice('$4500')).toBe(4500);
    expect(normalizePrice('€1200.50')).toBe(1200.5);
    expect(normalizePrice('  500  ')).toBe(500);
  });

  it('returns null for blank string', () => {
    expect(normalizePrice('')).toBeNull();
    expect(normalizePrice('   ')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(normalizePrice(null)).toBeNull();
  });

  it('returns valid number as-is', () => {
    expect(normalizePrice(4500)).toBe(4500);
    expect(normalizePrice(0)).toBe(0);
    expect(normalizePrice(1200.5)).toBe(1200.5);
  });

  it('returns null for NaN number', () => {
    expect(normalizePrice(NaN)).toBeNull();
  });

  it('returns null when stripped string is not a valid number', () => {
    expect(normalizePrice('abc')).toBeNull();
    expect(normalizePrice('$')).toBeNull();
  });
});

describe('parseStoredQuote', () => {
  it('parses valid JSON array', () => {
    const data = [
      { serviceId: 'abc', serviceName: 'Lawn Care', price: 500 },
      { serviceId: null, serviceName: 'Custom Work', price: null },
    ];
    expect(parseStoredQuote(JSON.stringify(data))).toEqual(data);
  });

  it('returns empty array for null input', () => {
    expect(parseStoredQuote(null)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseStoredQuote('')).toEqual([]);
  });

  it('returns empty array for malformed JSON', () => {
    expect(parseStoredQuote('not valid json {')).toEqual([]);
  });

  it('returns empty array when parsed value is not an array', () => {
    expect(parseStoredQuote(JSON.stringify({ services: [] }))).toEqual([]);
  });
});
