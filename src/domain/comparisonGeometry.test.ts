import { describe, expect, it } from 'vitest';
import { boundsViewBox, combinedDesignBounds } from './comparisonGeometry';
import type { Design } from './project';

const existing: Design = {
  id: 'e', name: 'Existing', kind: 'existing', vertices: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2000 }, { x: 0, y: 2000 }], fixtures: [], createdAt: '', updatedAt: '',
};
const proposed: Design = {
  id: 'p', name: 'Option A', kind: 'proposed', baselineDesignId: 'e', vertices: [{ x: -500, y: 0 }, { x: 4500, y: 0 }, { x: 4500, y: 2500 }, { x: -500, y: 2500 }], fixtures: [], createdAt: '', updatedAt: '',
};

describe('comparison geometry', () => {
  it('contains both designs with padding', () => {
    const bounds = combinedDesignBounds(existing, proposed);
    expect(bounds.minX).toBeLessThan(-500);
    expect(bounds.maxX).toBeGreaterThan(4500);
    expect(bounds.maxY).toBeGreaterThan(2500);
  });

  it('creates a positive SVG viewBox', () => {
    const viewBox = boundsViewBox(combinedDesignBounds(existing, proposed));
    const parts = viewBox.split(' ').map(Number);
    expect(parts[2]).toBeGreaterThan(0);
    expect(parts[3]).toBeGreaterThan(0);
  });
});
