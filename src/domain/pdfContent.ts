import type { EstimateSummary } from './estimating';
import type { RfqDocument } from './rfq';

export type PdfSection = {
  heading: string;
  lines: string[];
};

export function buildRfqPdfSections(rfq: RfqDocument): PdfSection[] {
  return [
    {
      heading: rfq.projectName,
      lines: [
        `Request for Quote`,
        `Existing design: ${rfq.existingDesignName}`,
        `Proposed design: ${rfq.proposedDesignName}`,
        rfq.overview,
      ],
    },
    {
      heading: 'Scope of work',
      lines: rfq.scope.map((item) => `${item.category}: ${item.title} — ${item.description}`),
    },
    {
      heading: 'Material planning quantities',
      lines: rfq.materials.map((item) => `${item.name}: ${item.quantity} ${item.unit} (${item.responsibility})${item.assumption ? ` — ${item.assumption}` : ''}`),
    },
    {
      heading: 'Requested pricing breakdown',
      lines: rfq.pricingRequest,
    },
    {
      heading: 'Contractor questions',
      lines: rfq.contractorQuestions,
    },
  ];
}

export function buildEstimatePdfSections(projectName: string, estimate: EstimateSummary): PdfSection[] {
  const format = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
  return [
    {
      heading: `${projectName} — ${estimate.mode === 'diy' ? 'DIY' : 'Contractor'} estimate`,
      lines: [
        `Quality tier: ${estimate.tier}`,
        `Low: ${format(estimate.total.low)}`,
        `Typical: ${format(estimate.total.typical)}`,
        `High: ${format(estimate.total.high)}`,
        'Planning estimate based on regional assumptions; not a contractor quote.',
      ],
    },
    {
      heading: 'Estimate breakdown',
      lines: [
        ...estimate.items.map((item) => `${item.category}: ${item.title} — ${format(item.cost.typical)} typical (${item.provenance})`),
        `Contingency — ${format(estimate.contingency.typical)} typical`,
      ],
    },
  ];
}
