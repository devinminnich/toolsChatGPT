import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cloneAsProposed,
  createId,
  nowIso,
  type FixtureInstance,
  type ObjectDefinition,
  type Point,
  type WorkspaceData,
} from '../domain/project';
import { createProjectInActiveHome, renameProject as renameWorkspaceProject, switchProject as switchWorkspaceProject } from '../domain/workspaceOperations';
import { workspacePersistence, type PersistenceStatus } from '../lib/persistence';

function createInitialWorkspace(vertices: Point[]): WorkspaceData {
  const now = nowIso();
  const homeId = createId('home');
  const projectId = createId('project');
  const designId = createId('design');
  return {
    schemaVersion: 1,
    activeHomeId: homeId,
    activeProjectId: projectId,
    objectDefinitions: [],
    updatedAt: now,
    homes: [{
      id: homeId,
      name: 'My House',
      createdAt: now,
      updatedAt: now,
      projects: [{
        id: projectId,
        homeId,
        name: 'Primary Bathroom',
        activeDesignId: designId,
        createdAt: now,
        updatedAt: now,
        designs: [{
          id: designId,
          name: 'Existing',
          kind: 'existing',
          vertices,
          fixtures: [],
          createdAt: now,
          updatedAt: now,
        }],
      }],
    }],
  };
}

export function useWorkspace(initialVertices: Point[]) {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => createInitialWorkspace(initialVertices));
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<PersistenceStatus>('idle');
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    workspacePersistence.load().then((saved) => {
      if (!cancelled && saved) setWorkspace(saved);
    }).finally(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setStatus('saving');
    saveTimer.current = window.setTimeout(() => {
      workspacePersistence.save(workspace)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [workspace, hydrated]);

  const activeHome = useMemo(
    () => workspace.homes.find((home) => home.id === workspace.activeHomeId) ?? workspace.homes[0],
    [workspace],
  );
  const activeProject = useMemo(
    () => activeHome?.projects.find((project) => project.id === workspace.activeProjectId) ?? activeHome?.projects[0],
    [activeHome, workspace.activeProjectId],
  );
  const activeDesign = useMemo(
    () => activeProject?.designs.find((design) => design.id === activeProject.activeDesignId) ?? activeProject?.designs[0],
    [activeProject],
  );

  function mutateActiveProject(mutator: (project: NonNullable<typeof activeProject>) => NonNullable<typeof activeProject>) {
    if (!activeHome || !activeProject) return;
    setWorkspace((current) => ({
      ...current,
      updatedAt: nowIso(),
      homes: current.homes.map((home) => home.id !== activeHome.id ? home : {
        ...home,
        updatedAt: nowIso(),
        projects: home.projects.map((project) => project.id === activeProject.id ? mutator(project) : project),
      }),
    }));
  }

  function updateActiveDesign(vertices: Point[], fixtures: FixtureInstance[]) {
    if (!activeDesign) return;
    mutateActiveProject((project) => ({
      ...project,
      updatedAt: nowIso(),
      designs: project.designs.map((design) => design.id === activeDesign.id ? {
        ...design,
        vertices,
        fixtures,
        updatedAt: nowIso(),
      } : design),
    }));
  }

  function switchDesign(designId: string) {
    mutateActiveProject((project) => ({ ...project, activeDesignId: designId, updatedAt: nowIso() }));
  }

  function duplicateActiveDesign(vertices = activeDesign?.vertices ?? [], fixtures = activeDesign?.fixtures ?? []) {
    if (!activeDesign || !activeProject) return null;
    const existingProposalCount = activeProject.designs.filter((design) => design.kind === 'proposed').length;
    const name = `Option ${String.fromCharCode(65 + existingProposalCount)}`;
    const sourceSnapshot = { ...activeDesign, vertices, fixtures, updatedAt: nowIso() };
    const next = cloneAsProposed(sourceSnapshot, name);
    mutateActiveProject((project) => ({
      ...project,
      activeDesignId: next.id,
      updatedAt: nowIso(),
      designs: [
        ...project.designs.map((design) => design.id === activeDesign.id ? sourceSnapshot : design),
        next,
      ],
    }));
    return next;
  }

  function saveObjectDefinition(fixture: FixtureInstance) {
    const existing = fixture.definitionId
      ? workspace.objectDefinitions.find((definition) => definition.id === fixture.definitionId)
      : undefined;
    const now = nowIso();
    const definition: ObjectDefinition = existing ? {
      ...existing,
      name: fixture.name,
      category: fixture.category,
      widthMm: fixture.widthMm,
      depthMm: fixture.depthMm,
      updatedAt: now,
    } : {
      id: createId('object'),
      name: fixture.name,
      category: fixture.category,
      widthMm: fixture.widthMm,
      depthMm: fixture.depthMm,
      createdAt: now,
      updatedAt: now,
    };

    setWorkspace((current) => ({
      ...current,
      updatedAt: now,
      objectDefinitions: existing
        ? current.objectDefinitions.map((item) => item.id === definition.id ? definition : item)
        : [...current.objectDefinitions, definition],
    }));

    return definition;
  }

  function createFixtureFromDefinition(definition: ObjectDefinition, xMm: number, yMm: number): FixtureInstance {
    const id = createId('fixture');
    return {
      id,
      lineageId: id,
      definitionId: definition.id,
      name: definition.name,
      category: definition.category,
      widthMm: definition.widthMm,
      depthMm: definition.depthMm,
      xMm,
      yMm,
      rotationDeg: 0,
    };
  }

  function createProject(name: string, vertices: Point[]) {
    setWorkspace((current) => createProjectInActiveHome(current, name, vertices));
  }

  function switchProject(projectId: string) {
    setWorkspace((current) => switchWorkspaceProject(current, projectId));
  }

  function renameProject(name: string) {
    if (!activeProject) return;
    setWorkspace((current) => renameWorkspaceProject(current, activeProject.id, name));
  }

  return {
    workspace,
    activeHome,
    activeProject,
    activeDesign,
    status,
    hydrated,
    updateActiveDesign,
    switchDesign,
    duplicateActiveDesign,
    saveObjectDefinition,
    createFixtureFromDefinition,
    createProject,
    switchProject,
    renameProject,
  };
}
