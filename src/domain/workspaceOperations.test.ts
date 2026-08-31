import { describe, expect, it, vi } from 'vitest';
import { createProjectInActiveHome, renameProject, switchProject } from './workspaceOperations';
import type { WorkspaceData } from './project';

const workspace: WorkspaceData = {
  schemaVersion: 1,
  activeHomeId: 'home-1',
  activeProjectId: 'project-1',
  objectDefinitions: [],
  updatedAt: '2026-08-31T00:00:00Z',
  homes: [{
    id: 'home-1', name: 'My House', createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z',
    projects: [{
      id: 'project-1', homeId: 'home-1', name: 'Bathroom', activeDesignId: 'design-1', createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z',
      designs: [{ id: 'design-1', name: 'Existing', kind: 'existing', vertices: [], fixtures: [], createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z' }],
    }],
  }],
};

describe('workspace project operations', () => {
  it('creates and activates a new project with an Existing design', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValueOnce('project-id').mockReturnValueOnce('design-id') });
    const next = createProjectInActiveHome(workspace, 'Back Patio', [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2000 }, { x: 0, y: 2000 }]);
    expect(next.homes[0].projects).toHaveLength(2);
    expect(next.activeProjectId).toBe('project_project-id');
    expect(next.homes[0].projects[1].name).toBe('Back Patio');
    expect(next.homes[0].projects[1].designs[0].kind).toBe('existing');
    vi.unstubAllGlobals();
  });

  it('switches and renames projects', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValueOnce('project-id').mockReturnValueOnce('design-id') });
    const created = createProjectInActiveHome(workspace, 'Garage', []);
    const switched = switchProject({ ...created, activeProjectId: 'project-1' }, 'project_project-id');
    const renamed = renameProject(switched, 'project_project-id', 'Workshop Garage');
    expect(switched.activeProjectId).toBe('project_project-id');
    expect(renamed.homes[0].projects[1].name).toBe('Workshop Garage');
    vi.unstubAllGlobals();
  });
});
