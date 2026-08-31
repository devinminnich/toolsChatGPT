import type { Design, Point } from './project';

export type ComparisonBounds = { minX: number; minY: number; maxX: number; maxY: number };

function pointsFor(design: Design): Point[] {
  return [
    ...design.vertices,
    ...design.fixtures.flatMap((fixture) => [
      { x: fixture.xMm, y: fixture.yMm },
      { x: fixture.xMm + fixture.widthMm, y: fixture.yMm + fixture.depthMm },
    ]),
  ];
}

export function combinedDesignBounds(existing: Design, proposed: Design, paddingRatio = 0.08): ComparisonBounds {
  const points = [...pointsFor(existing), ...pointsFor(proposed)];
  if (!points.length) return { minX: -100, minY: -100, maxX: 1100, maxY: 1100 };
  const raw = points.reduce((acc, point) => ({
    minX: Math.min(acc.minX, point.x), minY: Math.min(acc.minY, point.y),
    maxX: Math.max(acc.maxX, point.x), maxY: Math.max(acc.maxY, point.y),
  }), { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y });
  const width = Math.max(raw.maxX - raw.minX, 1000);
  const height = Math.max(raw.maxY - raw.minY, 1000);
  const pad = Math.max(width, height) * paddingRatio;
  return { minX: raw.minX - pad, minY: raw.minY - pad, maxX: raw.maxX + pad, maxY: raw.maxY + pad };
}

export function boundsViewBox(bounds: ComparisonBounds) {
  return `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`;
}
