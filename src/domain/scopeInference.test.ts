import { describe, expect, it } from 'vitest';
import { inferScope } from './scopeInference';
import type { DesignDiff } from './designDiff';

function baseDiff(): DesignDiff {
  return { fixtureChanges: [], geometryChanged: false };
}

describe('inferScope', () => {
  it('suggests plumbing relocation for a moved toilet', () => {
    const diff: DesignDiff = {
      ...baseDiff(),
      fixtureChanges: [{
        type: 'moved',
        lineageId: 'toilet-1',
        moveDistanceMm: 1200,
        before: {
          id: 'before', lineageId: 'toilet-1', name: 'Existing Toilet', category: 'Toilet',
          widthMm: 450, depthMm: 750, xMm: 0, yMm: 0, rotationDeg: 0,
        },
        after: {
          id: 'after', lineageId: 'toilet-1', name: 'Existing Toilet', category: 'Toilet',
          widthMm: 450, depthMm: 750, xMm: 1200, yMm: 0, rotationDeg: 0,
        },
      }],
    };

    const scope = inferScope(diff);
    expect(scope).toHaveLength(1);
    expect(scope[0].category).toBe('Plumbing');
    expect(scope[0].title).toContain('Relocate');
    expect(scope[0].status).toBe('suggested');
  });

  it('adds a reviewable construction suggestion for room geometry changes', () => {
    const scope = inferScope({ fixtureChanges: [], geometryChanged: true });
    expect(scope[0].title).toBe('Modify room/area geometry');
    expect(scope[0].status).toBe('suggested');
  });
});
