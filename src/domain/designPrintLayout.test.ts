import { describe, expect, it } from 'vitest';
import { createPrintTransform, designBounds } from './designPrintLayout';
import type { Design } from './project';

const design: Design = {
  id: 'd', name: 'Option A', kind: 'proposed', baselineDesignId: 'e',
  vertices: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2000 }, { x: 0, y: 2000 }],
  fixtures: [{ id: 'f', lineageId: 'f', name: 'Vanity', category: 'Vanity', xMm: 500, yMm: 400, widthMm: 1200, depthMm: 600, rotationDeg: 0 }],
  createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z',
};

describe('design print layout', () => {
  it('calculates the full design bounds', () => {
    expect(designBounds(design)).toEqual({ minX: 0, minY: 0, maxX: 4000, maxY: 2000 });
  });

  it('fits design geometry inside page margins', () => {
    const transform = createPrintTransform(design, 612, 792, 60);
    const topLeft = transform.point({ x: 0, y: 0 });
    const bottomRight = transform.point({ x: 4000, y: 2000 });
    expect(topLeft.x).toBeGreaterThanOrEqual(60);
    expect(topLeft.y).toBeGreaterThanOrEqual(60);
    expect(bottomRight.x).toBeLessThanOrEqual(552);
    expect(bottomRight.y).toBeLessThanOrEqual(732);
  });
});
