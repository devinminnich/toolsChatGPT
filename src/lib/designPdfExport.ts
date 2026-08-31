import { jsPDF } from 'jspdf';
import { createPrintTransform } from '../domain/designPrintLayout';
import type { Design, FixtureInstance, Point } from '../domain/project';
import { formatMeasurement } from './units';

function safeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';
}

function rotatePoint(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

function fixtureCorners(fixture: FixtureInstance): Point[] {
  const center = { x: fixture.xMm + fixture.widthMm / 2, y: fixture.yMm + fixture.depthMm / 2 };
  return [
    { x: fixture.xMm, y: fixture.yMm },
    { x: fixture.xMm + fixture.widthMm, y: fixture.yMm },
    { x: fixture.xMm + fixture.widthMm, y: fixture.yMm + fixture.depthMm },
    { x: fixture.xMm, y: fixture.yMm + fixture.depthMm },
  ].map((point) => rotatePoint(point, center, fixture.rotationDeg));
}

export function downloadDesignPdf(projectName: string, design: Design) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' });
  const pageWidth = 792;
  const pageHeight = 612;
  const transform = createPrintTransform(design, pageWidth, pageHeight - 70, 54);

  doc.setProperties({ title: `${projectName} — ${design.name}` });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(projectName, 54, 36);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${design.name} · dimensioned plan · dimensions shown in feet/inches`, 54, 52);

  const yOffset = 60;
  const mapPoint = (point: Point) => {
    const mapped = transform.point(point);
    return { x: mapped.x, y: mapped.y + yOffset };
  };

  doc.setDrawColor(25, 25, 25);
  doc.setLineWidth(2.2);
  design.vertices.forEach((start, index) => {
    const end = design.vertices[(index + 1) % design.vertices.length];
    const a = mapPoint(start);
    const b = mapPoint(end);
    doc.line(a.x, a.y, b.x, b.y);

    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(formatMeasurement(length, 'ft-in'), midX, midY - 5, { align: 'center' });
  });

  design.fixtures.forEach((fixture) => {
    const corners = fixtureCorners(fixture).map(mapPoint);
    doc.setDrawColor(55, 105, 180);
    doc.setLineWidth(1.1);
    for (let index = 0; index < corners.length; index += 1) {
      const a = corners[index];
      const b = corners[(index + 1) % corners.length];
      doc.line(a.x, a.y, b.x, b.y);
    }
    const center = mapPoint({ x: fixture.xMm + fixture.widthMm / 2, y: fixture.yMm + fixture.depthMm / 2 });
    doc.setTextColor(30, 64, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(fixture.name, center.x, center.y - 2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${formatMeasurement(fixture.widthMm, 'ft-in')} × ${formatMeasurement(fixture.depthMm, 'ft-in')}`, center.x, center.y + 7, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  });

  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text('Planning drawing. Field-verify dimensions and construction conditions before ordering materials or beginning work.', 54, pageHeight - 24);
  doc.save(`${safeFileName(projectName)}-${safeFileName(design.name)}-design.pdf`);
}
