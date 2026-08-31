import { describe, expect, it } from 'vitest';
import { formatMeasurement, inchesToMm, parseCoordinate, parseMeasurement, valueForCoordinateInput, valueForInput } from './units';

describe('measurement units', () => {
  it('treats bare numbers as inches in feet-and-inches mode', () => {
    expect(parseMeasurement('172', 'ft-in')).toBe(inchesToMm(172));
  });

  it('parses feet and inches exactly', () => {
    expect(parseMeasurement(`14' 4"`, 'ft-in')).toBe(inchesToMm(172));
    expect(parseMeasurement(`7' 8"`, 'ft-in')).toBe(inchesToMm(92));
  });

  it('round-trips common display formats without changing geometry', () => {
    const mm = inchesToMm(97.5);
    const displayed = valueForInput(mm, 'ft-in');
    expect(parseMeasurement(displayed, 'ft-in')).toBe(mm);
  });

  it('converts metric display modes from the same canonical millimeters', () => {
    expect(parseMeasurement('1000', 'mm')).toBe(1000);
    expect(parseMeasurement('100', 'cm')).toBe(1000);
    expect(parseMeasurement('1', 'm')).toBe(1000);
    expect(formatMeasurement(1000, 'm')).toBe('1 m');
  });

  it('supports signed coordinates independently from nonnegative dimensions', () => {
    expect(parseCoordinate('-12', 'in')).toBe(-inchesToMm(12));
    expect(parseCoordinate(`-1' 6"`, 'ft-in')).toBe(-inchesToMm(18));
    expect(valueForCoordinateInput(-inchesToMm(18), 'ft-in')).toBe(`-1' 6"`);
    expect(parseMeasurement('-12', 'in')).toBeNull();
  });
});
