import { useEffect, useMemo, useState } from 'react';
import { buildQuoteComparisonPdfSections } from './domain/pdfContent';
import { compareQuoteToRfq, type ContractorQuoteScopeItem, type NormalizedContractorQuote } from './domain/quoteComparison';
import { parseContractorQuoteText } from './domain/quoteParser';
import type { RfqDocument } from './domain/rfq';
import { downloadPdf } from './lib/pdfExport';
import { extractPdfText } from './lib/pdfTextExtraction';

function currency(value?: number) {
  if (value === undefined) return 'Not detected';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function numberFromInput(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
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
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const comparison = useMemo(() => quote ? compareQuoteToRfq(rfq, quote) : null, [rfq, quote]);

  useEffect(() => {
    if (!quote && savedQuotes.length) setQuote(savedQuotes[0]);
  }, [savedQuotes.length]);

  function analyzeText(sourceText = text) {
    if (!sourceText.trim()) return;
    setQuote(parseContractorQuoteText(sourceText));
    setSavedMessage(false);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImportStatus(`Reading ${file.name}…`);
    try {
      let extracted = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        extracted = await extractPdfText(file);
      } else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
        extracted = await file.text();
      } else {
        setImportStatus('This importer currently extracts PDF and text files. For an image/screenshot, paste the quote text for now.');
        return;
      }
      if (!extracted.trim()) {
        setImportStatus('No readable text was found in this file. It may be a scanned/image-only PDF.');
        return;
      }
      setText(extracted);
      analyzeText(extracted);
      setImportStatus(`Imported ${file.name}. Review the extracted fields below.`);
    } catch (error) {
      console.error(error);
      setImportStatus('The file could not be read. You can still paste the quote text manually.');
    }
  }

  function patchQuote(patch: Partial<NormalizedContractorQuote>) {
    setQuote((current) => current ? { ...current, ...patch } : current);
    setSavedMessage(false);
  }

  function patchScope(index: number, patch: Partial<ContractorQuoteScopeItem>) {
    if (!quote) return;
    patchQuote({ scope: quote.scope.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  }

  function removeScope(index: number) {
    if (!quote) return;
    patchQuote({ scope: quote.scope.filter((_, itemIndex) => itemIndex !== index) });
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
          <p className="muted">Upload a PDF/text proposal or paste quote text, review the extraction, correct it if needed, then save the normalized quote to the project.</p>
        </div>
        {quote && <button type="button" className="secondary-button" onClick={() => { setQuote(null); setText(''); setSavedMessage(false); setImportStatus(null); }}>New quote</button>}
      </div>

      {savedQuotes.length > 0 && <label className="saved-quote-picker">
        <span>Saved quotes</span>
        <select value={quote?.id ?? ''} onChange={(event) => { setQuote(savedQuotes.find((item) => item.id === event.target.value) ?? null); setSavedMessage(false); }}>
          <option value="">Select saved quote</option>
          {savedQuotes.map((item) => <option key={item.id} value={item.id}>{item.contractorName} · {currency(item.total)}</option>)}
        </select>
      </label>}

      {!quote ? <>
        <label className="quote-file-import">
          <span>Import contractor quote</span>
          <input type="file" accept="application/pdf,text/plain,.pdf,.txt" onChange={(event) => void importFile(event.target.files?.[0])} />
          <small>PDFs with selectable text and plain-text files are supported directly.</small>
        </label>
        {importStatus && <p className="import-status">{importStatus}</p>}
        <div className="quote-import-separator"><span>or paste text</span></div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste contractor estimate / proposal text here…" rows={8} />
        <button type="button" className="export-button" disabled={!text.trim()} onClick={() => analyzeText()}>Analyze quote</button>
      </> : <>
        {importStatus && <p className="import-status">{importStatus}</p>}
        <div className="quote-edit-grid">
          <label><span>Contractor</span><input value={quote.contractorName} onChange={(event) => patchQuote({ contractorName: event.target.value })} /></label>
          <label><span>Total</span><input inputMode="decimal" value={quote.total ?? ''} onChange={(event) => patchQuote({ total: numberFromInput(event.target.value) })} /></label>
          <label><span>Labor</span><input inputMode="decimal" value={quote.labor ?? ''} onChange={(event) => patchQuote({ labor: numberFromInput(event.target.value) })} /></label>
          <label><span>Materials</span><input inputMode="decimal" value={quote.materials ?? ''} onChange={(event) => patchQuote({ materials: numberFromInput(event.target.value) })} /></label>
          <label><span>Allowances</span><input inputMode="decimal" value={quote.allowances ?? ''} onChange={(event) => patchQuote({ allowances: numberFromInput(event.target.value) })} /></label>
          <label><span>Quote date</span><input value={quote.quoteDate ?? ''} onChange={(event) => patchQuote({ quoteDate: event.target.value || undefined })} /></label>
        </div>

        <p className="quote-warning">Automatically extracted fields are assistive. Verify them against the original contractor proposal before making a decision.</p>

        <details open className="normalized-scope-editor">
          <summary>Normalized quote scope ({quote.scope.length})</summary>
          <div className="normalized-scope-lines">
            {quote.scope.map((item, index) => <div className="normalized-scope-row" key={`${index}-${item.title}`}>
              <input value={item.title} onChange={(event) => patchScope(index, { title: event.target.value })} aria-label={`Quote scope item ${index + 1}`} />
              <select value={item.status} onChange={(event) => patchScope(index, { status: event.target.value as ContractorQuoteScopeItem['status'] })}>
                <option value="included">Included</option>
                <option value="excluded">Excluded</option>
                <option value="allowance">Allowance</option>
                <option value="optional">Optional</option>
              </select>
              <button type="button" className="secondary-button" onClick={() => removeScope(index)}>Remove</button>
            </div>)}
            <button type="button" className="secondary-button" onClick={() => patchQuote({ scope: [...quote.scope, { title: 'New scope item', status: 'included' }] })}>+ Scope item</button>
          </div>
        </details>

        <div className="quote-save-row">
          {onSaveQuote && <button type="button" className="export-button" onClick={saveQuote}>Save quote to project</button>}
          {comparison && <button type="button" className="secondary-button" onClick={() => downloadPdf(`${rfq.projectName} ${quote.contractorName} quote comparison`, buildQuoteComparisonPdfSections(rfq.projectName, quote, comparison))}>Download comparison PDF</button>}
          {savedMessage && <span>Saved</span>}
        </div>

        {comparison && <>
          <div className="quote-coverage-summary">
            <span>{comparison.counts.included} included</span>
            <span>{comparison.counts.excluded} excluded</span>
            <span>{comparison.counts.ambiguous} ambiguous</span>
            <span>{comparison.counts['not-mentioned']} not mentioned</span>
          </div>
          <div className="comparison-table" role="table" aria-label="RFQ scope compared with contractor quote">
            <div className="comparison-row comparison-head" role="row"><span>Requested scope</span><span>Quote status</span></div>
            {comparison.lines.map((line) => <div className="comparison-row" role="row" key={line.rfqScopeId}>
              <div><strong>{line.requestedTitle}</strong><small>{line.requestedCategory}</small>{line.matchedQuoteItem && <small>Matched: {line.matchedQuoteItem.title}</small>}</div>
              <span className={`comparison-status status-${line.status}`}>{line.status.replace('-', ' ')}</span>
            </div>)}
          </div>
        </>}

        {quote.exclusions.length > 0 && <details><summary>Detected exclusions ({quote.exclusions.length})</summary><ul>{quote.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      </>}
    </section>
  );
}
