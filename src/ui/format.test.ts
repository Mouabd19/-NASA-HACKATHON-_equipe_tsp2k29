import { describe, expect, it } from 'vitest';
import { dayToDate, fmt, fmtDay } from './format';

describe('fmt', () => {
  it('utilise le point décimal', () => {
    expect(fmt(8.7, 2)).toBe('8.70');
    expect(fmt(4.22)).toBe('4.22');
    expect(fmt(94)).toBe('94');
    expect(fmt(1.005, 1)).toBe('1.0');
    expect(fmt(-1.5, 1)).toBe('-1.5');
  });
  it('ne rend jamais -0 ni NaN', () => {
    expect(fmt(-0.001, 1)).toBe('0.0');
    expect(fmt(Number.NaN)).toBe('—');
    expect(fmt(Number.POSITIVE_INFINITY, 2)).toBe('—');
  });
});

describe('fmtDay', () => {
  it('préfixe D', () => {
    expect(fmtDay(94)).toBe('D94');
    expect(fmtDay(0)).toBe('D0');
  });
});

describe('dayToDate', () => {
  it('compte depuis J0 = 2026-08-12', () => {
    expect(dayToDate(0)).toBe('2026-08-12');
    expect(dayToDate(94)).toBe('2026-11-14');
    expect(dayToDate(860)).toBe('2028-12-19');
  });
});
