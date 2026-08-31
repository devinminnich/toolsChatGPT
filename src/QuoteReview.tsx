import { useEffect, useMemo, useState } from 'react';
import { compareQuoteToRfq, type NormalizedContractorQuote } from './domain/quoteComparison';
import { parseContractorQuoteText } from './domain/quoteParser';
import type { RfqDocument } from './domain/rfq';

function currency(value?: number) {
  if (value === undefined) return 'Not detected';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

type Props = {
  rfq: RfqDocument;
  savedQuotes?: NormalizedContractorQuote[];
  onSaveQuote?: (quote: NormalizedContractorQuote) => void;
};

export default function QuoteReview({ rfq, savedQuotes = [], onSaveQuote }: Props) {
  const [text, setText] = useState('');
  const [quote, setQuote] = useState<NormalizedContractorQuote | null>(savedQuotes[0] ?? null);
  const [savedMessage, setSavedMessage] = useState(false);
  const comparison = useMemo(() => quote ? compareQuoteToRfq(rfq, quote) : null, [rfq, quote]);

  useEffect(() => {
    if (!quote && savedQuotes.length) setQuote(savedQuotes[0]);
  }, [savedQuotes.length]);

  function analyze() {
    if (!text.trim()) return;
    setQuote(parseContractorQuoteText(text));
    setSavedMessage(false);
  }

  function saveQuote() {
    if (!quote || !onSaveQuote) return;
    onSaveQuote(quote);
    setSavedMessage(true);
  }

  return (
    <section className="review-card quote-card">
      <div className="quote-heading">
        <div>
          <h3>Contractor quote comparison</h3>
          <p className="muted">Paste quote text now. PDF/image extraction will feed the same normalized comparison model.</p>
        </div>
        {quote && <button type="button" className="secondary-button" onClick={() => { setQuote(null); setText(''); setSavedMessage(false); }}>New quote</button>}
      </div>

      {savedQuotes.length > 0 && <label className="saved-quote-picker">
        <span>Saved quotes</span>
        <select value={quote?.id ?? ''} onChange={(event) => setQuote(savedQuotes.find((item) => item.id === event.target.value) ?? null)}>
          <option value="">Select saved quote</option>
          {savedQuotes.map((item) => <option key={item.id} value={item.id}>{item.contractorName} · {currency(item.total)}</option>)}
        </select>
      </label>}

      {!quote ? <>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste contractor estimate / proposal text here…" rows={8} />
        <button type="button" className="export-button" disabled={!text.trim()} onClick={analyze}>Analyze quote</button>
      </> : <>
        <div className="quote-summary">
          <div><span>Contractor</span><strong>{quote.contractorName}</strong></div>
          <div><span>Total</span><strong>{currency(quote.total)}</strong></div>
          <div><span>Labor</span><strong>{currency(quote.labor)}</strong></div>
          <div><span>Materials</span><strong>{currency(quote.materials)}</strong></div>
        </div>

        <p className="quote-warning">Automatically extracted fields are assistive. Review the original contractor quote before making a decision.</p>
        {onSaveQuote && <div className="quote-save-row"><button type="button" className="export-button" onClick={saveQuote}>Save quote to project</button>{savedMessage && <span>Saved</span>}</div>}

        {comparison && <div className="comparison-table" role="table" aria-label="RFQ scope compared with contractor quote">
          <div className="comparison-row comparison-head" role="row"><span>Requested scope</span><span>Quote status</span></div>
          {comparison.lines.map((line) => <div className="comparison-row" role="row" key={line.rfqScopeId}>
            <div><strong>{line.requestedTitle}</strong><small>{line.requestedCategory}</small>{line.matchedQuoteItem && <small>Matched: {line.matchedQuoteItem.title}</small>}</div>
            <span className={`comparison-status status-${line.status}`}>{line.status.replace('-', ' ')}</span>
          </div>)}
        </div>}

        {quote.exclusions.length > 0 && <details><summary>Detected exclusions ({quote.exclusions.length})</summary><ul>{quote.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      </>}
    </section>
  );
}
