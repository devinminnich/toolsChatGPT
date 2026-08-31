import { compareQuoteToRfq, type NormalizedContractorQuote, type QuoteScopeStatus } from './quoteComparison';
import type { RfqDocument } from './rfq';

export type QuoteMatrixCell = {
  quoteId: string;
  contractorName: string;
  status: QuoteScopeStatus;
};

export type QuoteMatrixRow = {
  rfqScopeId: string;
  category: string;
  title: string;
  cells: QuoteMatrixCell[];
};

export type QuoteMatrixColumn = {
  quoteId: string;
  contractorName: string;
  total?: number;
  includedCount: number;
  excludedCount: number;
  ambiguousCount: number;
  notMentionedCount: number;
};

export type QuoteMatrix = {
  columns: QuoteMatrixColumn[];
  rows: QuoteMatrixRow[];
};

export function buildQuoteMatrix(rfq: RfqDocument, quotes: NormalizedContractorQuote[]): QuoteMatrix {
  const comparisons = quotes.map((quote) => ({ quote, comparison: compareQuoteToRfq(rfq, quote) }));

  return {
    columns: comparisons.map(({ quote, comparison }) => ({
      quoteId: quote.id,
      contractorName: quote.contractorName,
      total: quote.total,
      includedCount: comparison.counts.included,
      excludedCount: comparison.counts.excluded,
      ambiguousCount: comparison.counts.ambiguous,
      notMentionedCount: comparison.counts['not-mentioned'],
    })),
    rows: rfq.scope.map((scope) => ({
      rfqScopeId: scope.id,
      category: scope.category,
      title: scope.title,
      cells: comparisons.map(({ quote, comparison }) => ({
        quoteId: quote.id,
        contractorName: quote.contractorName,
        status: comparison.lines.find((line) => line.rfqScopeId === scope.id)?.status ?? 'not-mentioned',
      })),
    })),
  };
}
