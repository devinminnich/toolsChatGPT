import { describe, expect, it } from 'vitest';
import { appendProjectActivity } from './projectActivity';
import type { Project, ProjectActivity } from './project';

const project: Project = {
  id: 'p1',
  homeId: 'h1',
  name: 'Bathroom',
  designs: [],
  activeDesignId: '',
  createdAt: '2026-08-31T00:00:00Z',
  updatedAt: '2026-08-31T00:00:00Z',
};

function activity(id: string): ProjectActivity {
  return { id, type: 'scope-updated', title: id, createdAt: '2026-08-31T00:00:00Z' };
}

describe('project activity', () => {
  it('adds newest activity first', () => {
    const first = appendProjectActivity(project, activity('a'));
    const second = appendProjectActivity(first, activity('b'));
    expect(second.activity?.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('limits retained history', () => {
    const first = appendProjectActivity(project, activity('a'), 1);
    const second = appendProjectActivity(first, activity('b'), 1);
    expect(second.activity).toHaveLength(1);
    expect(second.activity?.[0].id).toBe('b');
  });
});
