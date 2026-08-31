import { useEffect, useMemo, useState } from 'react';
import {
  createHome,
  createProjectInActiveHome,
  renameHome,
  renameProject,
  renameProjectRoom,
  switchHome,
  switchProject,
  updateProjectRoomSetup,
} from './domain/workspaceOperations';
import type { Point, WorkspaceData } from './domain/project';
import { inchesToMm } from './lib/units';
import { openProjectRoomEditor } from './lib/projectRoomEvents';
import { WORKSPACE_SAVED_EVENT, workspacePersistence } from './lib/persistence';

const DEFAULT_ROOM_WIDTH_IN = 120;
const DEFAULT_ROOM_DEPTH_IN = 120;
const MM_PER_IN = 25.4;

function rectangleVertices(widthIn: number, depthIn: number): Point[] {
  const width = inchesToMm(widthIn);
  const depth = inchesToMm(depthIn);
  return [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: depth }, { x: 0, y: depth }];
}

function roomEnvelopeIn(vertices: Point[]) {
  if (!vertices.length) return { width: DEFAULT_ROOM_WIDTH_IN, depth: DEFAULT_ROOM_DEPTH_IN };
  const xs = vertices.map((point) => point.x);
  const ys = vertices.map((point) => point.y);
  return {
    width: (Math.max(...xs) - Math.min(...xs)) / MM_PER_IN,
    depth: (Math.max(...ys) - Math.min(...ys)) / MM_PER_IN,
  };
}

type FormMode = 'new-project' | 'rename-project' | 'edit-room' | 'new-home' | 'rename-home' | null;

export default function ProjectBar() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [projectName, setProjectName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [homeName, setHomeName] = useState('');
  const [firstProjectName, setFirstProjectName] = useState('First Project');
  const [firstRoomName, setFirstRoomName] = useState('');
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
    setRoomName('');
    setHomeName('');
    setFirstProjectName('First Project');
    setFirstRoomName('');
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
    if (!workspace || !projectName.trim() || !roomName.trim() || !validRoom) return;
    await persist(createProjectInActiveHome(
      workspace,
      projectName,
      rectangleVertices(Number(roomWidthIn), Number(roomDepthIn)),
      roomName,
    ));
    closeForm();
  }

  async function handleRenameProject() {
    if (!workspace || !activeProject || !projectName.trim()) return;
    await persist(renameProject(workspace, activeProject.id, projectName));
    closeForm();
  }

  async function handleSaveRoomRectangle() {
    if (!workspace || !activeProject || !roomName.trim() || !validRoom) return;
    await persist(updateProjectRoomSetup(
      workspace,
      activeProject.id,
      roomName,
      rectangleVertices(Number(roomWidthIn), Number(roomDepthIn)),
    ));
    closeForm();
  }

  async function handleOpenRoomDesigner() {
    if (!workspace || !activeProject || !roomName.trim()) return;
    const next = renameProjectRoom(workspace, activeProject.id, roomName);
    await persist(next);
    closeForm();
    openProjectRoomEditor(activeProject.id);
  }

  async function handleCreateHome() {
    if (!workspace || !homeName.trim() || !firstProjectName.trim() || !firstRoomName.trim() || !validRoom) return;
    await persist(createHome(
      workspace,
      homeName,
      firstProjectName,
      rectangleVertices(Number(roomWidthIn), Number(roomDepthIn)),
      firstRoomName,
    ));
    closeForm();
  }

  async function handleRenameHome() {
    if (!workspace || !activeHome || !homeName.trim()) return;
    await persist(renameHome(workspace, activeHome.id, homeName));
    closeForm();
  }

  function openRoomSetup() {
    if (!activeProject) return;
    const vertices = activeProject.roomVertices ?? activeProject.designs[0]?.vertices ?? [];
    const envelope = roomEnvelopeIn(vertices);
    setRoomName(activeProject.roomName ?? activeProject.name);
    setRoomWidthIn(String(Math.round(envelope.width * 100) / 100));
    setRoomDepthIn(String(Math.round(envelope.depth * 100) / 100));
    setFormMode('edit-room');
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

      <div className="project-room-summary" aria-label="Current room">
        <span>Room / area</span>
        <strong>{activeProject.roomName ?? activeProject.name}</strong>
      </div>

      <div className="project-actions">
        <button className="rename-home-action" type="button" onClick={() => { setHomeName(activeHome.name); setFormMode('rename-home'); }}>Rename home</button>
        <button className="rename-project-action" type="button" onClick={() => { setProjectName(activeProject.name); setFormMode('rename-project'); }}>Rename project</button>
        <button type="button" onClick={openRoomSetup}>Edit room</button>
        <button type="button" onClick={() => { setProjectName(''); setRoomName(''); resetRoomSize(); setFormMode('new-project'); }}>+ Project</button>
        <button type="button" onClick={() => { setHomeName(''); setFirstProjectName('First Project'); setFirstRoomName(''); resetRoomSize(); setFormMode('new-home'); }}>+ Home</button>
      </div>

      {formMode === 'rename-project' && <div className="project-inline-form">
        <input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Rename project" onKeyDown={(event) => { if (event.key === 'Enter') void handleRenameProject(); }} />
        <button type="button" onClick={() => void handleRenameProject()}>Save</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'new-project' && <div className="project-inline-form project-setup-form">
        <label><span>Project name</span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Bathroom remodel" aria-label="New project name" /></label>
        <label><span>Room / area name</span><input value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Primary Bathroom" aria-label="New project room name" /></label>
        {roomSizeFields}
        <p className="project-room-note">Start with a rectangle here. After creation, use Edit room to draw an exact custom room shape.</p>
        <button type="button" disabled={!projectName.trim() || !roomName.trim() || !validRoom} onClick={() => void handleCreateProject()}>Create project</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'edit-room' && <div className="project-inline-form project-setup-form">
        <label><span>Room / area name</span><input autoFocus value={roomName} onChange={(event) => setRoomName(event.target.value)} aria-label="Edit room name" /></label>
        {roomSizeFields}
        <p className="project-room-note">The room belongs to the project and is shared by Actual and every Proposal. Save a rectangle or open the room designer for an irregular shape.</p>
        <button type="button" disabled={!roomName.trim() || !validRoom} onClick={() => void handleSaveRoomRectangle()}>Save rectangle</button>
        <button type="button" disabled={!roomName.trim()} onClick={() => void handleOpenRoomDesigner()}>Design custom shape</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'rename-home' && <div className="project-inline-form">
        <input value={homeName} onChange={(event) => setHomeName(event.target.value)} aria-label="Rename home" onKeyDown={(event) => { if (event.key === 'Enter') void handleRenameHome(); }} />
        <button type="button" onClick={() => void handleRenameHome()}>Save</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}

      {formMode === 'new-home' && <div className="project-inline-form home-inline-form project-setup-form">
        <input autoFocus value={homeName} onChange={(event) => setHomeName(event.target.value)} placeholder="Main house, cabin…" aria-label="New home name" />
        <label><span>First project name</span><input value={firstProjectName} onChange={(event) => setFirstProjectName(event.target.value)} placeholder="Bathroom remodel" aria-label="First project name" /></label>
        <label><span>Room / area name</span><input value={firstRoomName} onChange={(event) => setFirstRoomName(event.target.value)} placeholder="Primary Bathroom" aria-label="First room name" /></label>
        {roomSizeFields}
        <button type="button" disabled={!homeName.trim() || !firstProjectName.trim() || !firstRoomName.trim() || !validRoom} onClick={() => void handleCreateHome()}>Create</button>
        <button type="button" onClick={closeForm}>Cancel</button>
      </div>}
    </section>
  );
}
