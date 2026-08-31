import { describe, expect, it } from 'vitest';
import { diffDesigns } from './designDiff';
import type { Design, FixtureInstance } from './project';

function fixture(overrides: Partial<FixtureInstance> = {}): FixtureInstance {
  return {
    id: 'instance-1',
    lineageId: 'lineage-1',
    name: 'Toilet',
    category: 'Toilet',
    widthMm: 450,
    depthMm: 750,
    xMm: 100,
    yMm: 100,
    rotationDeg: 0,
    ...overrides,
  };
}

function design(id: string, fixtures: FixtureInstance[], vertices = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 500 }]): Design {
  return {
    id,
    name: id,
    kind: id === 'existing' ? 'existing' : 'proposed',
    vertices,
    fixtures,
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  };
}

describe('diffDesigns', () => {
  it('detects movement, resize and rotation on the same lineage', () => {
    const before = design('existing', [fixture()]);
    const after = design('proposal', [fixture({ id: 'instance-2', xMm: 400, widthMm: 500, rotationDeg: 90 })]);

    const diff = diffDesigns(before, after);
    expect(diff.fixtureChanges.map((change) => change.type)).toEqual(['moved', 'resized', 'rotated']);
    expect(diff.fixtureChanges[0].moveDistanceMm).toBe(300);
  });

  it('detects added and removed fixtures independently of instance ids', () => {
    const before = design('existing', [fixture({ lineageId: 'old' })]);
    const after = design('proposal', [fixture({ id: 'new-instance', lineageId: 'new' })]);

    expect(diffDesigns(before, after).fixtureChanges.map((change) => change.type).sort()).toEqual(['added', 'removed']);
  });

  it('detects room geometry changes', () => {
    const before = design('existing', []);
    const after = design('proposal', [], [{ x: 0, y: 0 }, { x: 1200, y: 0 }, { x: 1000, y: 500 }]);
    expect(diffDesigns(before, after).geometryChanged).toBe(true);
  });
});
