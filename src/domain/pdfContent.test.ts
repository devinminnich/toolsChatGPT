import { describe, expect, it } from 'vitest';
import { buildEstimatePdfSections, buildQuoteComparisonPdfSections, buildRfqPdfSections } from './pdfContent';
import type { EstimateSummary } from './estimating';
import type { NormalizedContractorQuote, QuoteComparison } from './quoteComparison';
import type { RfqDocument } from './rfq';

const rfq: RfqDocument = {
  id: 'r', projectId: 'p', projectName: 'Primary Bathroom', generatedAt: '2026-08-31T00:00:00Z',
  existingDesignName: 'Existing', proposedDesignName: 'Option A', overview: 'Bathroom renovation RFQ.',
  scope: [{ id: 's', category: 'Plumbing', title: 'Relocate toilet', description: 'Move toilet plumbing.' }],
  materials: [{ id: 'm', category: 'Tile', name: 'Shower tile', quantity: 120, unit: 'sq ft', basis: 'Area', responsibility: 'undecided' }],
  pricingRequest: ['Labor subtotal'], contractorQuestions: ['What is excluded?'],
};

const estimate: EstimateSummary = {
  mode: 'contractor', tier: 'standard',
  items: [{ id: 'e', scopeId: 's', category: 'Plumbing', title: 'Relocate toilet', mode: 'contractor', tier: 'standard', cost: { low: 500, typical: 1000, high: 2000 }, provenance: 'regional-assumption', notes: [] }],
  subtotal: { low: 500, typical: 1000, high: 2000 },
  contingency: { low: 75, typical: 150, high: 300 },
  total: { low: 575, typical: 1150, high: 2300 },
};

const quote: NormalizedContractorQuote = {
  id: 'q', contractorName: 'ABC Remodeling', total: 12000, labor: 7000, materials: 5000,
  scope: [{ title: 'Relocate toilet plumbing', status: 'included' }], exclusions: ['Painting excluded'], notes: [], importedAt: '2026-08-31T00:00:00Z',
};

const comparison: QuoteComparison = {
  contractorName: 'ABC Remodeling', quoteTotal: 12000,
  lines: [{ rfqScopeId: 's', requestedTitle: 'Relocate toilet', requestedCategory: 'Plumbing', status: 'included', matchedQuoteItem: quote.scope[0] }],
  counts: { included: 1, excluded: 0, ambiguous: 0, 'not-mentioned': 0 }, exclusions: quote.exclusions,
};

describe('PDF content builders', () => {
  it('includes RFQ scope and material sections', () => {
    const sections = buildRfqPdfSections(rfq);
    expect(sections.some((section) => section.lines.some((line) => line.includes('Relocate toilet')))).toBe(true);
    expect(sections.some((section) => section.lines.some((line) => line.includes('Shower tile')))).toBe(true);
  });

  it('includes estimate range and breakdown', () => {
    const sections = buildEstimatePdfSections('Primary Bathroom', estimate);
    expect(sections[0].lines).toContain('Typical: $1,150');
    expect(sections[1].lines.some((line) => line.includes('Relocate toilet'))).toBe(true);
  });

  it('includes quote coverage and matched RFQ scope', () => {
    const sections = buildQuoteComparisonPdfSections('Primary Bathroom', quote, comparison);
    expect(sections[0].lines).toContain('Included requested items: 1');
    expect(sections[1].lines.some((line) => line.includes('Relocate toilet'))).toBe(true);
    expect(sections[2].lines).toContain('Painting excluded');
  });
});
