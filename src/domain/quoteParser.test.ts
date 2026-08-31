import { describe, expect, it } from 'vitest';
import { parseContractorQuoteText } from './quoteParser';

describe('parseContractorQuoteText', () => {
  it('extracts contractor, totals, and scope lines', () => {
    const quote = parseContractorQuoteText(`
Contractor: ABC Remodeling
Quote Date: 08/30/2026
- Remove existing vanity
- Relocate toilet plumbing
- Install shower tile
Materials: $4,500.00
Labor: $7,250.00
Total: $11,750.00
`);
    expect(quote.contractorName).toBe('ABC Remodeling');
    expect(quote.total).toBe(11750);
    expect(quote.labor).toBe(7250);
    expect(quote.materials).toBe(4500);
    expect(quote.scope.some((item) => item.title.includes('Relocate toilet'))).toBe(true);
  });

  it('classifies exclusions and allowances', () => {
    const quote = parseContractorQuoteText(`
Example Contractor
- Floor painting excluded
- Tile allowance $1,500
`);
    expect(quote.scope.find((item) => item.title.includes('painting'))?.status).toBe('excluded');
    expect(quote.scope.find((item) => item.title.includes('allowance'))?.status).toBe('allowance');
    expect(quote.exclusions).toHaveLength(1);
  });
});
