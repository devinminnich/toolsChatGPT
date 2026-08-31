import { jsPDF } from 'jspdf';
import type { PdfSection } from '../domain/pdfContent';

function safeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
}

export function downloadPdf(title: string, sections: PdfSection[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const maxWidth = 516;
  let y = 58;

  doc.setProperties({ title });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 26;

  for (const section of sections) {
    if (y > 690) {
      doc.addPage();
      y = 58;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(section.heading, margin, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    for (const line of section.lines.length ? section.lines : ['None']) {
      const wrapped = doc.splitTextToSize(line, maxWidth) as string[];
      const required = wrapped.length * 13 + 4;
      if (y + required > 738) {
        doc.addPage();
        y = 58;
      }
      doc.text(wrapped, margin, y);
      y += wrapped.length * 13 + 4;
    }
    y += 10;
  }

  doc.save(`${safeFileName(title)}.pdf`);
}
