import { useEffect, useMemo, useState } from 'react';
import { createProjectInActiveHome, renameProject, switchProject } from './domain/workspaceOperations';
import type { WorkspaceData } from './domain/project';
import { inchesToMm } from './lib/units';
import { WORKSPACE_SAVED_EVENT, workspacePersistence } from './lib/persistence';

const STARTER_SIZE = inchesToMm(120);
const STARTER_VERTICES = [
  { x: 0, y: 0 },
  { x: STARTER_SIZE, y: 0 },
  { x: STARTER_SIZE, y: STARTER_SIZE },
  { x: 0, y: STARTER_SIZE },
];

export default function ProjectBar() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    workspacePersistence.load().then(setWorkspace);
    const onSaved = (event: Event) => setWorkspace((event as CustomEvent<WorkspaceData>).detail);
    window.addEventListener(WORKSPACE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(WORKSPACE_SAVED_EVENT, onSaved);
  }, []);

  const activeHome = useMemo(() => workspace?.homes.find((home) => home.id === workspace.activeHomeId) ?? workspace?.homes[0], [workspace]);
  const activeProject = useMemo(() => activeHome?.projects.find((project) => project.id === workspace?.activeProjectId) ?? activeHome?.projects[0], [activeHome, workspace?.activeProjectId]);

  async function persist(next: WorkspaceData) {
    setWorkspace(next);
    await workspacePersistence.save(next);
  }

  async function handleSwitch(projectId: string) {
    if (!workspace) return;
    await persist(switchProject(workspace, projectId));
    setRenameOpen(false);
  }

  async function handleCreate() {
    if (!workspace || !newProjectName.trim()) return;
    const next = createProjectInActiveHome(workspace, newProjectName, STARTER_VERTICES);
    await persist(next);
    setNewProjectName('');
    setNewProjectOpen(false);
  }

  async function handleRename() {
    if (!workspace || !activeProject || !renameValue.trim()) return;
    await persist(renameProject(workspace, activeProject.id, renameValue));
    setRenameOpen(false);
  }

  if (!workspace || !activeHome || !activeProject) return null;

  return (
    <section className="project-bar" aria-label="Project navigation">
      <div className="project-select-group">
        <span>{activeHome.name}</span>
        <select value={activeProject.id} onChange={(event) => void handleSwitch(event.target.value)} aria-label="Current renovation project">
          {activeHome.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>

      <div className="project-actions">
        <button type="button" onClick={() => { setRenameValue(activeProject.name); setRenameOpen((value) => !value); setNewProjectOpen(false); }}>Rename</button>
        <button type="button" onClick={() => { setNewProjectOpen((value) => !value); setRenameOpen(false); }}>+ Project</button>
      </div>

      {renameOpen && <div className="project-inline-form">
        <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} aria-label="Rename project" onKeyDown={(event) => { if (event.key === 'Enter') void handleRename(); }} />
        <button type="button" onClick={() => void handleRename()}>Save</button>
        <button type="button" onClick={() => setRenameOpen(false)}>Cancel</button>
      </div>}

      {newProjectOpen && <div className="project-inline-form">
        <input autoFocus value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Kitchen, back patio, garage…" aria-label="New project name" onKeyDown={(event) => { if (event.key === 'Enter') void handleCreate(); }} />
        <button type="button" disabled={!newProjectName.trim()} onClick={() => void handleCreate()}>Create</button>
        <button type="button" onClick={() => setNewProjectOpen(false)}>Cancel</button>
      </div>}
    </section>
  );
}
