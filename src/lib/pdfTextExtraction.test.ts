import { describe, expect, it } from 'vitest';
import { joinPdfTextItems } from '../domain/pdfText';

describe('joinPdfTextItems', () => {
  it('preserves readable spaces and line endings from PDF text items', () => {
    const text = joinPdfTextItems([
      { str: 'ABC' }, { str: 'Remodeling', hasEOL: true },
      { str: 'Total:' }, { str: '$12,500', hasEOL: true },
      { str: 'Install' }, { str: 'tile' },
    ]);
    expect(text).toBe('ABC Remodeling\nTotal: $12,500\nInstall tile');
  });

  it('ignores blank PDF text items', () => {
    expect(joinPdfTextItems([{ str: '  ' }, { str: 'Labor' }, { str: '$5,000' }])).toBe('Labor $5,000');
  });
});
