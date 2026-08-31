import { useEffect, useMemo, useState } from 'react';
import { createHome, createProjectInActiveHome, renameHome, renameProject, switchHome, switchProject } from './domain/workspaceOperations';
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

type FormMode = 'new-project' | 'rename-project' | 'new-home' | 'rename-home' | null;

export default function ProjectBar() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [projectName, setProjectName] = useState('');
  const [homeName, setHomeName] = useState('');
  const [firstProjectName, setFirstProjectName] = useState('First Project');

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

  function closeForm() {
    setFormMode(null);
    setProjectName('');
    setHomeName('');
    setFirstProjectName('First Project');
  }

  async function handleSwitchHome(homeId: string) {
    if (!workspace) return;
    await persist(switchHome(workspace, homeId));
    closeForm();
  }

  async function handleSwitchProject(projectId: string) {
    if (!workspace) return;
    await persist(switchProject(workspace, projectId));
    closeForm();
  }

  async function handleCreateProject() {
    if (!workspace || !projectName.trim()) return;
    await persist(createProjectInActiveHome(workspace, projectName, STARTER_VERTICES));
    closeForm();
  }

  async function handleRenameProject() {
    if (!workspace || !activeProject || !projectName.trim()) return;
    await persist(renameProject(workspace, activeProject.id, projectName));
    closeForm();
  }

  async function handleCreateHome() {
    if (!workspace || !homeName.trim() || !firstProjectName.trim()) return;
    await persist(createHome(workspace, homeName, firstProjectName, STARTER_VERTICES));
    closeForm();
  }

  async function handleRenameHome() {
    if (!workspace || !activeHome || !homeName.trim()) return;
    await persist(renameHome(workspace, activeHome.id, homeName));
    closeForm();
  }

  if (!workspace || !activeHome || !activeProject) return null;

  return (
    <section className="project-bar" aria-label="Project navigation">
      <div className="project-select-group home-select-group">
        <span>Home</span>
        <select value={activeHome.id} onChange={(event) => void handleSwitchHome(event.target.value)} aria-label="Current home">
          {workspace.homes.map((home) => <option key={home.id} value={home.id}>{home.name}</option>)}
        </select>
      </div>

      <div className="project-select-group">
        <span>Project</span>
        <select value={activeProject.id} onChange={(event) => void handleSwitchProject(event.target.value)} aria-label="Current renovation project">
          {activeHome.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>

      <div className="project-actions">
        <button className="rename-home-action" type="button" onClick={() => { setHomeName(activeHome.name); setFormMode('rename-home'); }}>Rename home</button>
        <button className="rename-project-action" type="button" onClick={() => { setProjectName(activeProject.name); setFormMode('rename-project'); }}>Rename project</button>
        <button type="button" onClick={() => { setProjectName(''); setFormMode('new-project'); }}>+ Project</button>
        <button type="button" onClick={() => { setHomeName(''); setFirstProjectName('First Project'); setFormMode('new-home'); }}>+ Home</button>
      </div>

      {formMode === 'rename-project' && <div className="project-inline-form">
        <input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Rename project" onKeyDown={(event) => { if (event.key === 'Enter') void handleRenameProject(); }} />
        <button type="button" onClick={() => void handleRenameProject()}>Save</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'new-project' && <div className="project-inline-form">
        <input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Kitchen, back patio, garage…" aria-label="New project name" onKeyDown={(event) => { if (event.key === 'Enter') void handleCreateProject(); }} />
        <button type="button" disabled={!projectName.trim()} onClick={() => void handleCreateProject()}>Create</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'rename-home' && <div className="project-inline-form">
        <input value={homeName} onChange={(event) => setHomeName(event.target.value)} aria-label="Rename home" onKeyDown={(event) => { if (event.key === 'Enter') void handleRenameHome(); }} />
        <button type="button" onClick={() => void handleRenameHome()}>Save</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'new-home' && <div className="project-inline-form home-inline-form">
        <input autoFocus value={homeName} onChange={(event) => setHomeName(event.target.value)} placeholder="Main house, cabin…" aria-label="New home name" />
        <input value={firstProjectName} onChange={(event) => setFirstProjectName(event.target.value)} placeholder="First project" aria-label="First project name" onKeyDown={(event) => { if (event.key === 'Enter') void handleCreateHome(); }} />
        <button type="button" disabled={!homeName.trim() || !firstProjectName.trim()} onClick={() => void handleCreateHome()}>Create</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}
    </section>
  );
}
