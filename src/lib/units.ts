export type DisplayUnit = 'ft-in' | 'in' | 'ft' | 'mm' | 'cm' | 'm';

const MM_PER_IN = 25.4;
const MM_PER_FT = MM_PER_IN * 12;

export function inchesToMm(inches: number): number {
  return Math.round(inches * MM_PER_IN);
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_IN;
}

function convertNumberToMm(number: number, unit: Exclude<DisplayUnit, 'ft-in'>): number {
  switch (unit) {
    case 'in': return inchesToMm(number);
    case 'ft': return inchesToMm(number * 12);
    case 'mm': return Math.round(number);
    case 'cm': return Math.round(number * 10);
    case 'm': return Math.round(number * 1000);
  }
}

export function parseMeasurement(value: string, unit: DisplayUnit): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (unit === 'ft-in') {
    const match = trimmed.match(/^\s*(?:(\d+(?:\.\d+)?)\s*')?\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in)?)?\s*$/i);
    if (!match) return null;
    const feet = Number(match[1] ?? 0);
    const inches = Number(match[2] ?? 0);
    const totalInches = feet * 12 + inches;
    return Number.isFinite(totalInches) && totalInches >= 0 ? inchesToMm(totalInches) : null;
  }

  const number = Number(trimmed.replace(/[^0-9.+-]/g, ''));
  if (!Number.isFinite(number) || number < 0) return null;
  return convertNumberToMm(number, unit);
}

export function parseCoordinate(value: string, unit: DisplayUnit): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (unit === 'ft-in') {
    const negative = trimmed.startsWith('-');
    const unsigned = trimmed.replace(/^[-+]\s*/, '');
    const magnitude = parseMeasurement(unsigned, 'ft-in');
    return magnitude === null ? null : negative ? -magnitude : magnitude;
  }

  const number = Number(trimmed.replace(/[^0-9.+-]/g, ''));
  if (!Number.isFinite(number)) return null;
  return convertNumberToMm(number, unit);
}

export function formatMeasurement(mm: number, unit: DisplayUnit): string {
  switch (unit) {
    case 'ft-in': {
      const totalInches = mmToInches(mm);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches - feet * 12;
      const rounded = Math.round(inches * 8) / 8;
      if (rounded >= 12) return `${feet + 1}' 0"`;
      return `${feet}' ${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}"`;
    }
    case 'in': return `${(mm / MM_PER_IN).toFixed(1).replace(/\.0$/, '')} in`;
    case 'ft': return `${(mm / MM_PER_FT).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} ft`;
    case 'mm': return `${Math.round(mm)} mm`;
    case 'cm': return `${(mm / 10).toFixed(1).replace(/\.0$/, '')} cm`;
    case 'm': return `${(mm / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} m`;
  }
}

export function valueForInput(mm: number, unit: DisplayUnit): string {
  switch (unit) {
    case 'ft-in': return formatMeasurement(mm, unit);
    case 'in': return (mm / MM_PER_IN).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    case 'ft': return (mm / MM_PER_FT).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    case 'mm': return String(Math.round(mm));
    case 'cm': return (mm / 10).toFixed(1).replace(/\.0$/, '');
    case 'm': return (mm / 1000).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }
}

export function valueForCoordinateInput(mm: number, unit: DisplayUnit): string {
  if (mm >= 0) return valueForInput(mm, unit);
  return `-${valueForInput(Math.abs(mm), unit)}`;
}
