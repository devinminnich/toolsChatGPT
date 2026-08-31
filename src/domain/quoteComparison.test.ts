import { describe, expect, it } from 'vitest';
import { compareQuoteToRfq } from './quoteComparison';
import type { RfqDocument } from './rfq';

const rfq: RfqDocument = {
  id: 'rfq', projectId: 'p', projectName: 'Bathroom', generatedAt: '2026-08-31T00:00:00Z', existingDesignName: 'Existing', proposedDesignName: 'Option A', overview: '',
  scope: [
    { id: 'toilet', category: 'Plumbing', title: 'Relocate Toilet', description: 'Remove and relocate toilet including plumbing modifications.' },
    { id: 'tile', category: 'Tile', title: 'Install floor tile', description: 'Install new floor tile and grout.' },
  ],
  materials: [], pricingRequest: [], contractorQuestions: [],
};

describe('compareQuoteToRfq', () => {
  it('matches included quote scope and flags missing requested work', () => {
    const result = compareQuoteToRfq(rfq, {
      id: 'q', contractorName: 'Example Contractor', total: 12000,
      scope: [
        { title: 'Relocate toilet and plumbing', status: 'included' },
      ],
      exclusions: [], notes: [],
    });

    expect(result.lines.find((line) => line.rfqScopeId === 'toilet')?.status).toBe('included');
    expect(result.lines.find((line) => line.rfqScopeId === 'tile')?.status).toBe('not-mentioned');
  });

  it('recognizes explicit exclusions', () => {
    const result = compareQuoteToRfq(rfq, {
      id: 'q', contractorName: 'Example Contractor',
      scope: [], exclusions: ['Floor tile installation is excluded'], notes: [],
    });
    expect(result.lines.find((line) => line.rfqScopeId === 'tile')?.status).toBe('excluded');
  });
});
