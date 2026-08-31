import { describe, expect, it } from 'vitest';
import { calculateMaterials } from './materials';
import type { Design } from './project';

const design: Design = {
  id: 'd1',
  name: 'Proposed',
  kind: 'proposed',
  baselineDesignId: 'existing',
  vertices: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 2500 }, { x: 0, y: 2500 }],
  fixtures: [
    {
      id: 'shower-instance',
      lineageId: 'shower-lineage',
      name: 'Shower',
      category: 'Shower',
      widthMm: 1524,
      depthMm: 914.4,
      xMm: 0,
      yMm: 0,
      rotationDeg: 0,
    },
    {
      id: 'toilet-instance',
      lineageId: 'toilet-lineage',
      name: 'Toilet',
      category: 'Toilet',
      widthMm: 457.2,
      depthMm: 762,
      xMm: 2000,
      yMm: 0,
      rotationDeg: 0,
    },
  ],
  createdAt: '2026-08-31T00:00:00Z',
  updatedAt: '2026-08-31T00:00:00Z',
};

describe('calculateMaterials', () => {
  it('expands a shower into the expected assembly components', () => {
    const materials = calculateMaterials(design);
    const names = materials.map((item) => item.name);
    expect(names).toContain('Shower tile');
    expect(names).toContain('Waterproofing membrane/system');
    expect(names).toContain('Tile backer/substrate');
    expect(names).toContain('Thinset mortar');
    expect(names).toContain('Grout');
    expect(names).toContain('Color-matched silicone/sealant');
  });

  it('adds common toilet installation consumables', () => {
    const materials = calculateMaterials(design);
    expect(materials.some((item) => item.name === 'Toilet seal/ring')).toBe(true);
    expect(materials.some((item) => item.name === 'Toilet supply connector')).toBe(true);
  });

  it('shows shower assumptions rather than pretending geometry is fully known', () => {
    const tile = calculateMaterials(design).find((item) => item.name === 'Shower tile');
    expect(tile?.assumption).toContain('8 ft');
    expect(tile?.wastePercent).toBe(12);
  });
});
