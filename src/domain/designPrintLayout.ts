import type { Design, Point } from './project';

export type PrintBounds = { minX: number; minY: number; maxX: number; maxY: number };
export type PrintPoint = { x: number; y: number };

export function designBounds(design: Design): PrintBounds {
  const points: Point[] = [
    ...design.vertices,
    ...design.fixtures.flatMap((fixture) => [
      { x: fixture.xMm, y: fixture.yMm },
      { x: fixture.xMm + fixture.widthMm, y: fixture.yMm + fixture.depthMm },
    ]),
  ];
  if (!points.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  return points.reduce((acc, point) => ({
    minX: Math.min(acc.minX, point.x), minY: Math.min(acc.minY, point.y),
    maxX: Math.max(acc.maxX, point.x), maxY: Math.max(acc.maxY, point.y),
  }), { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y });
}

export function createPrintTransform(design: Design, pageWidth: number, pageHeight: number, margin: number) {
  const bounds = designBounds(design);
  const sourceWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const sourceHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const usableWidth = Math.max(pageWidth - margin * 2, 1);
  const usableHeight = Math.max(pageHeight - margin * 2, 1);
  const scale = Math.min(usableWidth / sourceWidth, usableHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const offsetX = margin + (usableWidth - renderedWidth) / 2;
  const offsetY = margin + (usableHeight - renderedHeight) / 2;

  return {
    bounds,
    scale,
    point(point: Point): PrintPoint {
      return {
        x: offsetX + (point.x - bounds.minX) * scale,
        y: offsetY + (point.y - bounds.minY) * scale,
      };
    },
  };
}
