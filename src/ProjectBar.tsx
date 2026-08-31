import { useEffect, useMemo, useState } from 'react';
import { createHome, createProjectInActiveHome, renameHome, renameProject, switchHome, switchProject } from './domain/workspaceOperations';
import type { Point, WorkspaceData } from './domain/project';
import { inchesToMm } from './lib/units';
import { WORKSPACE_SAVED_EVENT, workspacePersistence } from './lib/persistence';

const DEFAULT_ROOM_WIDTH_IN = 120;
const DEFAULT_ROOM_DEPTH_IN = 120;

function rectangleVertices(widthIn: number, depthIn: number): Point[] {
  const width = inchesToMm(widthIn);
  const depth = inchesToMm(depthIn);
  return [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: depth }, { x: 0, y: depth }];
}

type FormMode = 'new-project' | 'rename-project' | 'new-home' | 'rename-home' | null;

export default function ProjectBar() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [projectName, setProjectName] = useState('');
  const [homeName, setHomeName] = useState('');
  const [firstProjectName, setFirstProjectName] = useState('First Project');
  const [roomWidthIn, setRoomWidthIn] = useState(String(DEFAULT_ROOM_WIDTH_IN));
  const [roomDepthIn, setRoomDepthIn] = useState(String(DEFAULT_ROOM_DEPTH_IN));

  useEffect(() => {
    workspacePersistence.load().then(setWorkspace);
    const onSaved = (event: Event) => setWorkspace((event as CustomEvent<WorkspaceData>).detail);
    window.addEventListener(WORKSPACE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(WORKSPACE_SAVED_EVENT, onSaved);
  }, []);

  const activeHome = useMemo(() => workspace?.homes.find((home) => home.id === workspace.activeHomeId) ?? workspace?.homes[0], [workspace]);
  const activeProject = useMemo(() => activeHome?.projects.find((project) => project.id === workspace?.activeProjectId) ?? activeHome?.projects[0], [activeHome, workspace?.activeProjectId]);
  const validRoom = Number(roomWidthIn) > 0 && Number(roomDepthIn) > 0;

  async function persist(next: WorkspaceData) {
    setWorkspace(next);
    await workspacePersistence.save(next);
  }

  function resetRoomSize() {
    setRoomWidthIn(String(DEFAULT_ROOM_WIDTH_IN));
    setRoomDepthIn(String(DEFAULT_ROOM_DEPTH_IN));
  }

  function closeForm() {
    setFormMode(null);
    setProjectName('');
    setHomeName('');
    setFirstProjectName('First Project');
    resetRoomSize();
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
    if (!workspace || !projectName.trim() || !validRoom) return;
    await persist(createProjectInActiveHome(workspace, projectName, rectangleVertices(Number(roomWidthIn), Number(roomDepthIn))));
    closeForm();
  }

  async function handleRenameProject() {
    if (!workspace || !activeProject || !projectName.trim()) return;
    await persist(renameProject(workspace, activeProject.id, projectName));
    closeForm();
  }

  async function handleCreateHome() {
    if (!workspace || !homeName.trim() || !firstProjectName.trim() || !validRoom) return;
    await persist(createHome(workspace, homeName, firstProjectName, rectangleVertices(Number(roomWidthIn), Number(roomDepthIn))));
    closeForm();
  }

  async function handleRenameHome() {
    if (!workspace || !activeHome || !homeName.trim()) return;
    await persist(renameHome(workspace, activeHome.id, homeName));
    closeForm();
  }

  if (!workspace || !activeHome || !activeProject) return null;

  const roomSizeFields = <div className="project-room-fields">
    <label><span>Room width (in)</span><input inputMode="decimal" value={roomWidthIn} onChange={(event) => setRoomWidthIn(event.target.value)} aria-label="Room width in inches" /></label>
    <label><span>Room depth (in)</span><input inputMode="decimal" value={roomDepthIn} onChange={(event) => setRoomDepthIn(event.target.value)} aria-label="Room depth in inches" /></label>
  </div>;

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
        <button type="button" onClick={() => { setProjectName(''); resetRoomSize(); setFormMode('new-project'); }}>+ Project</button>
        <button type="button" onClick={() => { setHomeName(''); setFirstProjectName('First Project'); resetRoomSize(); setFormMode('new-home'); }}>+ Home</button>
      </div>

      {formMode === 'rename-project' && <div className="project-inline-form">
        <input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Rename project" onKeyDown={(event) => { if (event.key === 'Enter') void handleRenameProject(); }} />
        <button type="button" onClick={() => void handleRenameProject()}>Save</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'new-project' && <div className="project-inline-form project-setup-form">
        <input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Kitchen, back patio, garage…" aria-label="New project name" />
        {roomSizeFields}
        <p className="project-room-note">Set the room boundary for this project first. The design options will share this same room.</p>
        <button type="button" disabled={!projectName.trim() || !validRoom} onClick={() => void handleCreateProject()}>Create project</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'rename-home' && <div className="project-inline-form">
        <input value={homeName} onChange={(event) => setHomeName(event.target.value)} aria-label="Rename home" onKeyDown={(event) => { if (event.key === 'Enter') void handleRenameHome(); }} />
        <button type="button" onClick={() => void handleRenameHome()}>Save</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'new-home' && <div className="project-inline-form home-inline-form project-setup-form">
        <input autoFocus value={homeName} onChange={(event) => setHomeName(event.target.value)} placeholder="Main house, cabin…" aria-label="New home name" />
        <input value={firstProjectName} onChange={(event) => setFirstProjectName(event.target.value)} placeholder="First project" aria-label="First project name" />
        {roomSizeFields}
        <p className="project-room-note">Set the first project room boundary now; it stays shared across its design options.</p>
        <button type="button" disabled={!homeName.trim() || !firstProjectName.trim() || !validRoom} onClick={() => void handleCreateHome()}>Create</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}
    </section>
  );
}
