import * as pdfjsLib from 'pdfjs-dist';
import { joinPdfTextItems, type PdfTextLikeItem } from '../domain/pdfText';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(joinPdfTextItems(content.items as PdfTextLikeItem[]));
  }

  return pages.filter(Boolean).join('\n\n');
}
