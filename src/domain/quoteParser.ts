import type { ContractorQuoteScopeItem, NormalizedContractorQuote } from './quoteComparison';

function money(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function findMoney(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:\\-]?\\s*\\$?([0-9][0-9,]*(?:\\.[0-9]{2})?)`, 'i');
    const match = text.match(pattern);
    if (match) return money(match[1]);
  }
  return undefined;
}

function cleanBullet(line: string) {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
}

function classifyScopeLine(line: string): ContractorQuoteScopeItem | null {
  const cleaned = cleanBullet(line);
  if (cleaned.length < 5) return null;
  const lower = cleaned.toLowerCase();
  if (/^(total|subtotal|tax|deposit|payment|date|quote|estimate|proposal|customer|address)\b/.test(lower)) return null;
  if (/\b(excluded|exclusion|not included|by owner|owner responsible)\b/.test(lower)) return { title: cleaned, status: 'excluded' };
  if (/\b(optional|option|alternate|add-on|add on)\b/.test(lower)) return { title: cleaned, status: 'optional' };
  if (/\ballowance\b/.test(lower)) return { title: cleaned, status: 'allowance' };
  if (/\b(remove|demo|demolish|install|replace|relocate|move|provide|repair|paint|tile|plumb|wire|frame|drywall|waterproof|grout|permit|dispose)\b/.test(lower)) return { title: cleaned, status: 'included' };
  return null;
}

function contractorNameFromText(text: string) {
  const explicit = text.match(/(?:contractor|company|prepared by)\s*[:\-]\s*([^\n]+)/i)?.[1]?.trim();
  if (explicit) return explicit;
  const firstUseful = text.split(/\r?\n/).map((line) => line.trim()).find((line) => line.length >= 3 && line.length <= 80);
  return firstUseful ?? 'Imported Contractor';
}

export function parseContractorQuoteText(text: string, id = `quote:${Date.now()}`): NormalizedContractorQuote {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const scope = lines.map(classifyScopeLine).filter((item): item is ContractorQuoteScopeItem => Boolean(item));
  const exclusions = scope.filter((item) => item.status === 'excluded').map((item) => item.title);
  const quoteDate = text.match(/(?:quote date|estimate date|date)\s*[:\-]\s*([A-Za-z0-9,\-/ ]{6,20})/i)?.[1]?.trim();
  const expirationDate = text.match(/(?:expires|expiration|valid through|valid until)\s*[:\-]\s*([A-Za-z0-9,\-/ ]{6,20})/i)?.[1]?.trim();

  return {
    id,
    contractorName: contractorNameFromText(text),
    quoteDate,
    expirationDate,
    total: findMoney(text, ['grand total', 'proposal total', 'estimate total', 'total']),
    labor: findMoney(text, ['labor subtotal', 'labor']),
    materials: findMoney(text, ['materials subtotal', 'material subtotal', 'materials', 'material']),
    allowances: findMoney(text, ['allowances', 'allowance']),
    scope,
    exclusions,
    notes: ['Automatically normalized from pasted quote text. Review extracted fields before relying on comparison results.'],
    sourceText: text,
    importedAt: new Date().toISOString(),
  };
}
