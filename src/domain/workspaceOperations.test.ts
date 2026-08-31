import { describe, expect, it, vi } from 'vitest';
import { createHome, createProjectInActiveHome, renameHome, renameProject, switchHome, switchProject } from './workspaceOperations';
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
  it('creates and activates a new project with an Existing design and checkpoint', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('project-id')
      .mockReturnValueOnce('design-id')
      .mockReturnValueOnce('activity-id') });
    const next = createProjectInActiveHome(workspace, 'Back Patio', [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2000 }, { x: 0, y: 2000 }]);
    const project = next.homes[0].projects[1];
    expect(next.homes[0].projects).toHaveLength(2);
    expect(next.activeProjectId).toBe('project_project-id');
    expect(project.name).toBe('Back Patio');
    expect(project.designs[0].kind).toBe('existing');
    expect(project.activity?.[0]).toMatchObject({ type: 'project-created', title: 'Project created', detail: 'Back Patio' });
    vi.unstubAllGlobals();
  });

  it('switches and renames projects with a rename checkpoint', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('project-id')
      .mockReturnValueOnce('design-id')
      .mockReturnValueOnce('create-activity-id')
      .mockReturnValueOnce('rename-activity-id') });
    const created = createProjectInActiveHome(workspace, 'Garage', []);
    const switched = switchProject({ ...created, activeProjectId: 'project-1' }, 'project_project-id');
    const renamed = renameProject(switched, 'project_project-id', 'Workshop Garage');
    const project = renamed.homes[0].projects[1];
    expect(switched.activeProjectId).toBe('project_project-id');
    expect(project.name).toBe('Workshop Garage');
    expect(project.activity?.[0]).toMatchObject({ type: 'project-renamed', detail: 'Garage → Workshop Garage' });
    vi.unstubAllGlobals();
  });

  it('creates, switches, and renames a second home with its own first project', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('home-2')
      .mockReturnValueOnce('project-2')
      .mockReturnValueOnce('design-2')
      .mockReturnValueOnce('activity-2') });
    const created = createHome(workspace, 'Mountain House', 'Kitchen', [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }]);
    expect(created.homes).toHaveLength(2);
    expect(created.activeHomeId).toBe('home_home-2');
    expect(created.activeProjectId).toBe('project_project-2');
    expect(created.homes[1].projects[0].name).toBe('Kitchen');

    const switched = switchHome(created, 'home-1');
    expect(switched.activeHomeId).toBe('home-1');
    expect(switched.activeProjectId).toBe('project-1');

    const renamed = renameHome(created, 'home_home-2', 'Cabin');
    expect(renamed.homes[1].name).toBe('Cabin');
    vi.unstubAllGlobals();
  });
});
