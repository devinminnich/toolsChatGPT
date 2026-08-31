import { describe, expect, it, vi } from 'vitest';
import {
  createHome,
  createProjectInActiveHome,
  renameHome,
  renameProject,
  renameProjectRoom,
  switchHome,
  switchProject,
  updateProjectRoomSetup,
} from './workspaceOperations';
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
      id: 'project-1', homeId: 'home-1', name: 'Bathroom Remodel', roomName: 'Bathroom', activeDesignId: 'design-1', createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z',
      roomVertices: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 0, y: 1000 }],
      designs: [{ id: 'design-1', name: 'Existing', kind: 'existing', vertices: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 0, y: 1000 }], fixtures: [], createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z' }],
    }],
  }],
};

describe('workspace project operations', () => {
  it('creates and activates a new project with project-level room metadata', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('project-id')
      .mockReturnValueOnce('design-id')
      .mockReturnValueOnce('activity-id') });
    const vertices = [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2000 }, { x: 0, y: 2000 }];
    const next = createProjectInActiveHome(workspace, 'Patio Remodel', vertices, 'Back Patio');
    const project = next.homes[0].projects[1];
    expect(next.homes[0].projects).toHaveLength(2);
    expect(next.activeProjectId).toBe('project_project-id');
    expect(project.name).toBe('Patio Remodel');
    expect(project.roomName).toBe('Back Patio');
    expect(project.roomVertices).toEqual(vertices);
    expect(project.designs[0].kind).toBe('existing');
    expect(project.activity?.[0]).toMatchObject({ type: 'project-created', title: 'Project created', detail: 'Patio Remodel · Back Patio' });
    vi.unstubAllGlobals();
  });

  it('switches and renames projects with a rename checkpoint', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('project-id')
      .mockReturnValueOnce('design-id')
      .mockReturnValueOnce('create-activity-id')
      .mockReturnValueOnce('rename-activity-id') });
    const created = createProjectInActiveHome(workspace, 'Garage', [], 'Garage');
    const switched = switchProject({ ...created, activeProjectId: 'project-1' }, 'project_project-id');
    const renamed = renameProject(switched, 'project_project-id', 'Workshop Garage');
    const project = renamed.homes[0].projects[1];
    expect(switched.activeProjectId).toBe('project_project-id');
    expect(project.name).toBe('Workshop Garage');
    expect(project.activity?.[0]).toMatchObject({ type: 'project-renamed', detail: 'Garage → Workshop Garage' });
    vi.unstubAllGlobals();
  });

  it('renames the room and updates one canonical room boundary across designs', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('room-activity') });
    const renamed = renameProjectRoom(workspace, 'project-1', 'Primary Bathroom');
    expect(renamed.homes[0].projects[0].roomName).toBe('Primary Bathroom');

    const roomVertices = [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 3500, y: 2500 }, { x: 0, y: 2000 }];
    const updated = updateProjectRoomSetup(renamed, 'project-1', 'Primary Bathroom', roomVertices);
    const project = updated.homes[0].projects[0];
    expect(project.roomVertices).toEqual(roomVertices);
    expect(project.designs.every((design) => JSON.stringify(design.vertices) === JSON.stringify(roomVertices))).toBe(true);
    vi.unstubAllGlobals();
  });

  it('creates, switches, and renames a second home with its own named first room', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('home-2')
      .mockReturnValueOnce('project-2')
      .mockReturnValueOnce('design-2')
      .mockReturnValueOnce('activity-2') });
    const created = createHome(workspace, 'Mountain House', 'Kitchen Remodel', [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }], 'Kitchen');
    expect(created.homes).toHaveLength(2);
    expect(created.activeHomeId).toBe('home_home-2');
    expect(created.activeProjectId).toBe('project_project-2');
    expect(created.homes[1].projects[0].name).toBe('Kitchen Remodel');
    expect(created.homes[1].projects[0].roomName).toBe('Kitchen');

    const switched = switchHome(created, 'home-1');
    expect(switched.activeHomeId).toBe('home-1');
    expect(switched.activeProjectId).toBe('project-1');

    const renamed = renameHome(created, 'home_home-2', 'Cabin');
    expect(renamed.homes[1].name).toBe('Cabin');
    vi.unstubAllGlobals();
  });
});
