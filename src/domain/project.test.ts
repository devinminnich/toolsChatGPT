import { describe, expect, it } from 'vitest';
import { cloneAsProposed, type Design } from './project';

describe('cloneAsProposed', () => {
  it('preserves geometry and object lineage while creating new instance ids', () => {
    const source: Design = {
      id: 'design_existing',
      name: 'Existing',
      kind: 'existing',
      vertices: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 500 }],
      fixtures: [{
        id: 'fixture_original',
        lineageId: 'fixture_original',
        name: 'Toilet',
        category: 'Toilet',
        widthMm: 450,
        depthMm: 750,
        xMm: 100,
        yMm: 100,
        rotationDeg: 0,
      }],
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    };

    const proposal = cloneAsProposed(source, 'Option A');

    expect(proposal.id).not.toBe(source.id);
    expect(proposal.kind).toBe('proposed');
    expect(proposal.baselineDesignId).toBe(source.id);
    expect(proposal.vertices).toEqual(source.vertices);
    expect(proposal.vertices).not.toBe(source.vertices);
    expect(proposal.fixtures[0].id).not.toBe(source.fixtures[0].id);
    expect(proposal.fixtures[0].lineageId).toBe(source.fixtures[0].lineageId);
  });

  it('keeps the original baseline when cloning an existing proposal', () => {
    const source: Design = {
      id: 'design_option_a',
      name: 'Option A',
      kind: 'proposed',
      baselineDesignId: 'design_existing',
      vertices: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 500 }],
      fixtures: [],
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T00:00:00.000Z',
    };

    expect(cloneAsProposed(source, 'Option B').baselineDesignId).toBe('design_existing');
  });
});
