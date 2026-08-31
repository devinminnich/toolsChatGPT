import { createId, nowIso, type Point, type WorkspaceData } from './project';
import { appendProjectActivity, createProjectActivity } from './projectActivity';

function createProject(homeId: string, name: string, vertices: Point[]) {
  const now = nowIso();
  const projectId = createId('project');
  const designId = createId('design');
  const trimmedName = name.trim() || 'New Project';
  const project = appendProjectActivity({
    id: projectId,
    homeId,
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
  }, createProjectActivity('project-created', 'Project created', trimmedName));
  return project;
}

export function createHome(
  workspace: WorkspaceData,
  homeName: string,
  firstProjectName: string,
  vertices: Point[],
): WorkspaceData {
  const now = nowIso();
  const homeId = createId('home');
  const homeLabel = homeName.trim() || 'New Home';
  const project = createProject(homeId, firstProjectName || 'First Project', vertices);
  return {
    ...workspace,
    activeHomeId: homeId,
    activeProjectId: project.id,
    updatedAt: now,
    homes: [...workspace.homes, {
      id: homeId,
      name: homeLabel,
      projects: [project],
      createdAt: now,
      updatedAt: now,
    }],
  };
}

export function switchHome(workspace: WorkspaceData, homeId: string): WorkspaceData {
  const home = workspace.homes.find((item) => item.id === homeId);
  if (!home) return workspace;
  return {
    ...workspace,
    activeHomeId: home.id,
    activeProjectId: home.projects[0]?.id ?? '',
    updatedAt: nowIso(),
  };
}

export function renameHome(workspace: WorkspaceData, homeId: string, name: string): WorkspaceData {
  const trimmedName = name.trim();
  if (!trimmedName) return workspace;
  const now = nowIso();
  return {
    ...workspace,
    updatedAt: now,
    homes: workspace.homes.map((home) => home.id === homeId && home.name !== trimmedName
      ? { ...home, name: trimmedName, updatedAt: now }
      : home),
  };
}

export function createProjectInActiveHome(workspace: WorkspaceData, name: string, vertices: Point[]): WorkspaceData {
  const home = workspace.homes.find((item) => item.id === workspace.activeHomeId) ?? workspace.homes[0];
  if (!home) return workspace;
  const now = nowIso();
  const project = createProject(home.id, name, vertices);

  return {
    ...workspace,
    activeHomeId: home.id,
    activeProjectId: project.id,
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
      projects: home.projects.map((project) => {
        if (project.id !== projectId || project.name === trimmedName) return project;
        return appendProjectActivity(
          { ...project, name: trimmedName, updatedAt: now },
          createProjectActivity('project-renamed', 'Project renamed', `${project.name} → ${trimmedName}`),
        );
      }),
    })),
  };
}
