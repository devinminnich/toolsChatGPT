export type PdfTextLikeItem = { str?: string; hasEOL?: boolean };

export function joinPdfTextItems(items: PdfTextLikeItem[]) {
  let result = '';
  for (const item of items) {
    const value = item.str?.trim();
    if (value) {
      if (result && !result.endsWith('\n')) result += ' ';
      result += value;
    }
    if (item.hasEOL && !result.endsWith('\n')) result += '\n';
  }
  return result.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
