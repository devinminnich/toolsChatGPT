import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type TextLikeItem = { str?: string; hasEOL?: boolean };

export function joinPdfTextItems(items: TextLikeItem[]) {
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

export async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(joinPdfTextItems(content.items as TextLikeItem[]));
  }

  return pages.filter(Boolean).join('\n\n');
}
