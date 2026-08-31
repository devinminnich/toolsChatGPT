import { createId, nowIso, type Point, type WorkspaceData } from './project';

export function createProjectInActiveHome(workspace: WorkspaceData, name: string, vertices: Point[]): WorkspaceData {
  const home = workspace.homes.find((item) => item.id === workspace.activeHomeId) ?? workspace.homes[0];
  if (!home) return workspace;
  const now = nowIso();
  const projectId = createId('project');
  const designId = createId('design');
  const trimmedName = name.trim() || 'New Project';
  const project = {
    id: projectId,
    homeId: home.id,
    name: trimmedName,
    activeDesignId: designId,
    createdAt: now,
    updatedAt: now,
    designs: [{
      id: designId,
      name: 'Existing',
      kind: 'existing' as const,
      vertices: vertices.map((point) => ({ ...point })),
      fixtures: [],
      createdAt: now,
      updatedAt: now,
    }],
  };

  return {
    ...workspace,
    activeHomeId: home.id,
    activeProjectId: projectId,
    updatedAt: now,
    homes: workspace.homes.map((item) => item.id !== home.id ? item : {
      ...item,
      updatedAt: now,
      projects: [...item.projects, project],
    }),
  };
}

export function switchProject(workspace: WorkspaceData, projectId: string): WorkspaceData {
  const targetHome = workspace.homes.find((home) => home.projects.some((project) => project.id === projectId));
  if (!targetHome) return workspace;
  return { ...workspace, activeHomeId: targetHome.id, activeProjectId: projectId, updatedAt: nowIso() };
}

export function renameProject(workspace: WorkspaceData, projectId: string, name: string): WorkspaceData {
  const trimmedName = name.trim();
  if (!trimmedName) return workspace;
  const now = nowIso();
  return {
    ...workspace,
    updatedAt: now,
    homes: workspace.homes.map((home) => ({
      ...home,
      projects: home.projects.map((project) => project.id !== projectId ? project : { ...project, name: trimmedName, updatedAt: now }),
    })),
  };
}
