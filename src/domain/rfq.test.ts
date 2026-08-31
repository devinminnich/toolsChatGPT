import { describe, expect, it } from 'vitest';
import { generateRfq } from './rfq';
import type { Design, Project } from './project';

const existing: Design = {
  id: 'existing', name: 'Existing', kind: 'existing', vertices: [], fixtures: [], createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z',
};
const proposed: Design = {
  id: 'proposed', name: 'Option A', kind: 'proposed', baselineDesignId: 'existing', vertices: [], fixtures: [], createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z',
};
const project: Project = {
  id: 'project', homeId: 'home', name: 'Primary Bathroom', activeDesignId: proposed.id,
  designs: [existing, proposed], createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z',
};

describe('generateRfq', () => {
  it('omits ignored scope and requests contractor exclusions', () => {
    const rfq = generateRfq(project, existing, proposed, [
      { id: 'accepted', category: 'Plumbing', title: 'Relocate toilet', description: 'Move toilet', status: 'accepted' },
      { id: 'ignored', category: 'Painting', title: 'Paint', description: 'Paint', status: 'ignored' },
    ], []);

    expect(rfq.scope).toHaveLength(1);
    expect(rfq.scope[0].title).toBe('Relocate toilet');
    expect(rfq.contractorQuestions.some((question) => question.toLowerCase().includes('excluded'))).toBe(true);
  });

  it('marks generated material responsibility undecided by default', () => {
    const rfq = generateRfq(project, existing, proposed, [], [
      { id: 'tile', category: 'Tile', name: 'Shower tile', quantity: 100, unit: 'sq ft', basis: 'Calculated area' },
    ]);
    expect(rfq.materials[0].responsibility).toBe('undecided');
  });
});
