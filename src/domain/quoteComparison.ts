import type { RfqDocument } from './rfq';

export type QuoteScopeStatus = 'included' | 'excluded' | 'ambiguous' | 'not-mentioned';

export type ContractorQuoteScopeItem = {
  title: string;
  description?: string;
  status: 'included' | 'excluded' | 'allowance' | 'optional';
};

export type NormalizedContractorQuote = {
  id: string;
  contractorName: string;
  quoteDate?: string;
  expirationDate?: string;
  total?: number;
  labor?: number;
  materials?: number;
  allowances?: number;
  schedule?: string;
  paymentTerms?: string;
  scope: ContractorQuoteScopeItem[];
  exclusions: string[];
  notes: string[];
};

export type QuoteComparisonLine = {
  rfqScopeId: string;
  requestedTitle: string;
  requestedCategory: string;
  status: QuoteScopeStatus;
  matchedQuoteItem?: ContractorQuoteScopeItem;
};

export type QuoteComparison = {
  contractorName: string;
  quoteTotal?: number;
  lines: QuoteComparisonLine[];
  counts: Record<QuoteScopeStatus, number>;
  exclusions: string[];
};

function tokens(value: string) {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'existing', 'proposed', 'required', 'affected']);
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !stop.has(word));
}

function similarity(a: string, b: string) {
  const aTokens = new Set(tokens(a));
  const bTokens = new Set(tokens(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  for (const token of aTokens) if (bTokens.has(token)) overlap += 1;
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function matchStatus(item: ContractorQuoteScopeItem): QuoteScopeStatus {
  if (item.status === 'included' || item.status === 'allowance') return 'included';
  if (item.status === 'excluded') return 'excluded';
  return 'ambiguous';
}

export function compareQuoteToRfq(rfq: RfqDocument, quote: NormalizedContractorQuote): QuoteComparison {
  const lines = rfq.scope.map<QuoteComparisonLine>((requested) => {
    const requestedText = `${requested.category} ${requested.title} ${requested.description}`;
    const ranked = quote.scope
      .map((item) => ({ item, score: similarity(requestedText, `${item.title} ${item.description ?? ''}`) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];

    if (!best || best.score < 0.2) {
      const exclusionMatch = quote.exclusions.some((exclusion) => similarity(requestedText, exclusion) >= 0.2);
      return {
        rfqScopeId: requested.id,
        requestedTitle: requested.title,
        requestedCategory: requested.category,
        status: exclusionMatch ? 'excluded' : 'not-mentioned',
      };
    }

    return {
      rfqScopeId: requested.id,
      requestedTitle: requested.title,
      requestedCategory: requested.category,
      status: matchStatus(best.item),
      matchedQuoteItem: best.item,
    };
  });

  const counts: Record<QuoteScopeStatus, number> = {
    included: 0,
    excluded: 0,
    ambiguous: 0,
    'not-mentioned': 0,
  };
  for (const line of lines) counts[line.status] += 1;

  return {
    contractorName: quote.contractorName,
    quoteTotal: quote.total,
    lines,
    counts,
    exclusions: quote.exclusions,
  };
}
