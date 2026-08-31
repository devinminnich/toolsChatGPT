import { useEffect, useMemo, useRef, useState } from 'react';
import { createId, type FixtureInstance, type Point } from './domain/project';
import { pinchViewport, type ScreenPoint } from './domain/viewportGestures';
import { useWorkspace } from './hooks/useWorkspace';
import { DisplayUnit, formatMeasurement, inchesToMm, parseCoordinate, parseMeasurement, valueForCoordinateInput, valueForInput } from './lib/units';
import { PROJECT_ROOM_EDIT_EVENT } from './lib/projectRoomEvents';

type Mode = 'select' | 'draw' | 'pan';
type ViewBox = { x: number; y: number; width: number; height: number };
type DragState =
  | { kind: 'fixture'; pointerId: number; fixtureId: string; offsetX: number; offsetY: number }
  | { kind: 'vertex'; pointerId: number; vertexIndex: number }
  | null;

type PanState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startView: ViewBox;
};

type PinchState = {
  startView: ViewBox;
  pointerIds: [number, number];
  startPoints: [ScreenPoint, ScreenPoint];
};

const INITIAL_WIDTH = inchesToMm(172);
const INITIAL_DEPTH = inchesToMm(92);
const GRID_MM = inchesToMm(1);
const SNAP_MM = inchesToMm(3);
const CLOSE_MM = inchesToMm(6);

const presets = [
  { name: 'Toilet', category: 'Toilet', widthIn: 18, depthIn: 30 },
  { name: 'Shower', category: 'Shower', widthIn: 60, depthIn: 36 },
  { name: 'Vanity', category: 'Vanity', widthIn: 48, depthIn: 22 },
];

function rectangleVertices(width: number, depth: number): Point[] {
  return [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: depth }, { x: 0, y: depth }];
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function bounds(points: Point[]) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  return points.reduce((acc, point) => ({
    minX: Math.min(acc.minX, point.x),
    minY: Math.min(acc.minY, point.y),
    maxX: Math.max(acc.maxX, point.x),
    maxY: Math.max(acc.maxY, point.y),
  }), { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y });
}

function snap(value: number) {
  return Math.round(value / GRID_MM) * GRID_MM;
}

function snapPoint(point: Point, anchors: Point[] = []): Point {
  const result = { x: snap(point.x), y: snap(point.y) };
  for (const anchor of anchors) {
    if (Math.abs(point.x - anchor.x) <= SNAP_MM) result.x = anchor.x;
    if (Math.abs(point.y - anchor.y) <= SNAP_MM) result.y = anchor.y;
  }
  return result;
}

function snapWall(point: Point, previous: Point) {
  const dx = point.x - previous.x;
  const dy = point.y - previous.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const step = Math.PI / 4;
  const target = Math.round(angle / step) * step;
  const delta = Math.abs(Math.atan2(Math.sin(angle - target), Math.cos(angle - target)));
  if (delta <= (8 * Math.PI) / 180) {
    return snapPoint({ x: previous.x + Math.cos(target) * length, y: previous.y + Math.sin(target) * length }, [previous]);
  }
  return snapPoint(point, [previous]);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

export default function PersistentPlanner() {
  const initial = useMemo(() => rectangleVertices(INITIAL_WIDTH, INITIAL_DEPTH), []);
  const workspace = useWorkspace(initial);
  const [unit, setUnit] = useState<DisplayUnit>('ft-in');
  const [vertices, setVertices] = useState<Point[]>(initial);
  const [fixtures, setFixtures] = useState<FixtureInstance[]>([]);
  const [draft, setDraft] = useState<Point[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [selectedWall, setSelectedWall] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('select');
  const [roomEditing, setRoomEditing] = useState(false);
  const [drag, setDrag] = useState<DragState>(null);
  const [view, setView] = useState<ViewBox>({ x: -600, y: -600, width: INITIAL_WIDTH + 1200, height: INITIAL_DEPTH + 1200 });
  const [widthInput, setWidthInput] = useState(valueForInput(INITIAL_WIDTH, 'ft-in'));
  const [depthInput, setDepthInput] = useState(valueForInput(INITIAL_DEPTH, 'ft-in'));
  const [customObjectOpen, setCustomObjectOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customWidthInput, setCustomWidthInput] = useState('');
  const [customDepthInput, setCustomDepthInput] = useState('');
  const [customObjectError, setCustomObjectError] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef<PanState | null>(null);
  const touchPointsRef = useRef<Map<number, ScreenPoint>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const loadedDesignRef = useRef<string | null>(null);

  const activeDesign = workspace.activeDesign;
  const activeProject = workspace.activeProject;
  const selectedFixture = fixtures.find((fixture) => fixture.id === selectedFixtureId) ?? null;
  const roomBounds = useMemo(() => bounds(vertices), [vertices]);
  const roomName = activeProject?.roomName ?? activeProject?.name ?? 'Room';
  const projectRoomSignature = workspace.roomVertices.map((point) => `${point.x}:${point.y}`).join('|');
  const roomWidth = roomBounds.maxX - roomBounds.minX;
  const roomDepth = roomBounds.maxY - roomBounds.minY;
  const wallLength = selectedWall === null ? null : distance(vertices[selectedWall], vertices[(selectedWall + 1) % vertices.length]);

  useEffect(() => {
    if (!workspace.hydrated || !activeDesign) return;
    if (loadedDesignRef.current === activeDesign.id) return;
    loadedDesignRef.current = activeDesign.id;
    const canonicalRoom = workspace.roomVertices.length ? workspace.roomVertices : activeDesign.vertices;
    setVertices(canonicalRoom);
    setFixtures(activeDesign.fixtures);
    const nextBounds = bounds(canonicalRoom);
    const width = Math.max(nextBounds.maxX - nextBounds.minX, 1000);
    const height = Math.max(nextBounds.maxY - nextBounds.minY, 1000);
    const pad = Math.max(width, height) * 0.16 + 250;
    setView({ x: nextBounds.minX - pad, y: nextBounds.minY - pad, width: width + pad * 2, height: height + pad * 2 });
    setWidthInput(valueForInput(width, unit));
    setDepthInput(valueForInput(height, unit));
    setSelectedFixtureId(null);
    setSelectedWall(null);
    setRoomEditing(false);
  }, [workspace.hydrated, activeDesign?.id, activeProject?.id]);

  useEffect(() => {
    if (!workspace.hydrated || roomEditing || !workspace.roomVertices.length) return;
    const localSignature = vertices.map((point) => `${point.x}:${point.y}`).join('|');
    if (localSignature === projectRoomSignature) return;
    setVertices(workspace.roomVertices);
    fitToView(workspace.roomVertices);
  }, [projectRoomSignature, activeProject?.id, roomEditing]);

  useEffect(() => {
    const openRoomEditor = () => {
      if (!activeProject) return;
      const canonicalRoom = workspace.roomVertices.length ? workspace.roomVertices : activeDesign?.vertices ?? vertices;
      setVertices(canonicalRoom.map((point) => ({ ...point })));
      const room = bounds(canonicalRoom);
      setWidthInput(valueForInput(room.maxX - room.minX, unit));
      setDepthInput(valueForInput(room.maxY - room.minY, unit));
      setDraft([]);
      setSelectedFixtureId(null);
      setSelectedWall(null);
      setMode('select');
      setRoomEditing(true);
      fitToView(canonicalRoom);
    };
    window.addEventListener(PROJECT_ROOM_EDIT_EVENT, openRoomEditor);
    return () => window.removeEventListener(PROJECT_ROOM_EDIT_EVENT, openRoomEditor);
  }, [activeProject?.id, activeDesign?.id, projectRoomSignature, unit]);

  useEffect(() => {
    if (!workspace.hydrated || !activeDesign || loadedDesignRef.current !== activeDesign.id) return;
    workspace.updateActiveDesign(vertices, fixtures);
  }, [vertices, fixtures]);

  function svgPoint(clientX: number, clientY: number): Point | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function relativeScreenPoint(event: React.PointerEvent<SVGSVGElement>): ScreenPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function fitToView(points = vertices) {
    const next = bounds(points);
    const width = Math.max(next.maxX - next.minX, 1000);
    const height = Math.max(next.maxY - next.minY, 1000);
    const pad = Math.max(width, height) * 0.16 + 250;
    setView({ x: next.minX - pad, y: next.minY - pad, width: width + pad * 2, height: height + pad * 2 });
  }

  function changeUnit(next: DisplayUnit) {
    setUnit(next);
    setWidthInput(valueForInput(roomWidth, next));
    setDepthInput(valueForInput(roomDepth, next));
  }

  function createRectangle() {
    if (!roomEditing) return;
    const width = parseMeasurement(widthInput, unit);
    const depth = parseMeasurement(depthInput, unit);
    if (!width || !depth || width < 300 || depth < 300) return;
    const next = rectangleVertices(width, depth);
    setVertices(next);
    setDraft([]);
    setMode('select');
    fitToView(next);
  }

  function addPreset(name: string, category: string, widthIn: number, depthIn: number) {
    const id = createId('fixture');
    const fixture: FixtureInstance = {
      id,
      lineageId: id,
      name,
      category,
      widthMm: inchesToMm(widthIn),
      depthMm: inchesToMm(depthIn),
      xMm: roomBounds.minX + roomWidth / 2 - inchesToMm(widthIn) / 2,
      yMm: roomBounds.minY + roomDepth / 2 - inchesToMm(depthIn) / 2,
      rotationDeg: 0,
    };
    setFixtures((items) => [...items, fixture]);
    setSelectedFixtureId(id);
    setSelectedWall(null);
    setMode('select');
  }

  function openCustomObjectCreator() {
    setCustomName('');
    setCustomWidthInput(valueForInput(inchesToMm(24), unit));
    setCustomDepthInput(valueForInput(inchesToMm(24), unit));
    setCustomObjectError('');
    setCustomObjectOpen(true);
  }

  function createCustomObject() {
    const name = customName.trim();
    const widthMm = parseMeasurement(customWidthInput, unit);
    const depthMm = parseMeasurement(customDepthInput, unit);
    if (!name) {
      setCustomObjectError('Give the object a name.');
      return;
    }
    if (!widthMm || !depthMm || widthMm < 25 || depthMm < 25) {
      setCustomObjectError('Enter valid width and depth values.');
      return;
    }

    const id = createId('fixture');
    const fixture: FixtureInstance = {
      id,
      lineageId: id,
      name,
      category: 'Custom',
      widthMm,
      depthMm,
      xMm: Math.round(view.x + view.width / 2 - widthMm / 2),
      yMm: Math.round(view.y + view.height / 2 - depthMm / 2),
      rotationDeg: 0,
    };
    setFixtures((items) => [...items, fixture]);
    setSelectedFixtureId(id);
    setSelectedWall(null);
    setMode('select');
    setCustomObjectOpen(false);
    setCustomObjectError('');
  }

  function addSavedObject(definitionId: string) {
    const definition = workspace.workspace.objectDefinitions.find((item) => item.id === definitionId);
    if (!definition) return;
    const fixture = workspace.createFixtureFromDefinition(
      definition,
      roomBounds.minX + roomWidth / 2 - definition.widthMm / 2,
      roomBounds.minY + roomDepth / 2 - definition.depthMm / 2,
    );
    setFixtures((items) => [...items, fixture]);
    setSelectedFixtureId(fixture.id);
    setSelectedWall(null);
  }

  function saveSelectedObject() {
    if (!selectedFixture) return;
    const definition = workspace.saveObjectDefinition(selectedFixture);
    setFixtures((items) => items.map((item) => item.id === selectedFixture.id ? { ...item, definitionId: definition.id } : item));
  }

  function duplicateSelectedFixture() {
    if (!selectedFixture) return;
    const id = createId('fixture');
    const duplicate: FixtureInstance = {
      ...selectedFixture,
      id,
      lineageId: id,
      xMm: selectedFixture.xMm + GRID_MM * 2,
      yMm: selectedFixture.yMm + GRID_MM * 2,
    };
    setFixtures((items) => [...items, duplicate]);
    setSelectedFixtureId(id);
  }

  function duplicateDesign() {
    const next = workspace.duplicateActiveDesign(vertices, fixtures);
    if (next) loadedDesignRef.current = null;
  }

  function switchDesign(id: string) {
    loadedDesignRef.current = null;
    workspace.switchDesign(id);
  }

  function beginDraw() {
    if (!roomEditing) return;
    setDraft([]);
    setSelectedFixtureId(null);
    setSelectedWall(null);
    setMode('draw');
  }

  function undoLastDraftLine() {
    setDraft((points) => points.length > 1 ? points.slice(0, -1) : points);
  }

  function clearDraft() {
    setDraft([]);
  }

  function finishRoomEdit() {
    if (vertices.length < 3) return;
    workspace.updateProjectRoom(vertices);
    setRoomEditing(false);
    setMode('select');
    setDraft([]);
    setSelectedWall(null);
  }

  function cancelRoomEdit() {
    const canonicalRoom = workspace.roomVertices.length ? workspace.roomVertices : activeDesign?.vertices ?? initial;
    setVertices(canonicalRoom.map((point) => ({ ...point })));
    setRoomEditing(false);
    setMode('select');
    setDraft([]);
    setSelectedWall(null);
    fitToView(canonicalRoom);
  }

  function canvasPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch') {
      event.currentTarget.setPointerCapture(event.pointerId);
      touchPointsRef.current.set(event.pointerId, relativeScreenPoint(event));
      if (touchPointsRef.current.size >= 2) {
        const entries = Array.from(touchPointsRef.current.entries()).slice(0, 2);
        pinchRef.current = {
          startView: view,
          pointerIds: [entries[0][0], entries[1][0]],
          startPoints: [entries[0][1], entries[1][1]],
        };
        panRef.current = null;
        return;
      }
    }

    if (mode === 'pan' || event.button === 1) {
      event.currentTarget.setPointerCapture(event.pointerId);
      panRef.current = { pointerId: event.pointerId, startClientX: event.clientX, startClientY: event.clientY, startView: view };
      return;
    }

    if (!roomEditing || mode !== 'draw') {
      setSelectedFixtureId(null);
      setSelectedWall(null);
      return;
    }

    const raw = svgPoint(event.clientX, event.clientY);
    if (!raw) return;
    if (!draft.length) {
      setDraft([snapPoint(raw)]);
      return;
    }
    if (draft.length >= 3 && distance(raw, draft[0]) <= CLOSE_MM) {
      setVertices(draft);
      setDraft([]);
      setMode('select');
      fitToView(draft);
      return;
    }
    const point = snapWall(raw, draft[draft.length - 1]);
    if (distance(point, draft[draft.length - 1]) >= GRID_MM) setDraft((items) => [...items, point]);
  }

  function canvasPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch' && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.set(event.pointerId, relativeScreenPoint(event));
      const pinch = pinchRef.current;
      if (pinch) {
        const currentA = touchPointsRef.current.get(pinch.pointerIds[0]);
        const currentB = touchPointsRef.current.get(pinch.pointerIds[1]);
        if (currentA && currentB) {
          const rect = event.currentTarget.getBoundingClientRect();
          setView(pinchViewport(pinch.startView, pinch.startPoints[0], pinch.startPoints[1], currentA, currentB, { width: rect.width, height: rect.height }));
        }
        return;
      }
    }

    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - pan.startClientX) / rect.width) * pan.startView.width;
    const dy = ((event.clientY - pan.startClientY) / rect.height) * pan.startView.height;
    setView({ ...pan.startView, x: pan.startView.x - dx, y: pan.startView.y - dy });
  }

  function canvasPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === 'touch') {
      touchPointsRef.current.delete(event.pointerId);
      if (pinchRef.current?.pointerIds.includes(event.pointerId)) pinchRef.current = null;
    }
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
  }

  function startFixtureDrag(event: React.PointerEvent<SVGGElement>, fixture: FixtureInstance) {
    if (mode !== 'select') return;
    event.stopPropagation();
    const point = svgPoint(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedFixtureId(fixture.id);
    setSelectedWall(null);
    setDrag({ kind: 'fixture', pointerId: event.pointerId, fixtureId: fixture.id, offsetX: point.x - fixture.xMm, offsetY: point.y - fixture.yMm });
  }

  function moveFixture(event: React.PointerEvent<SVGGElement>) {
    if (!drag || drag.kind !== 'fixture' || drag.pointerId !== event.pointerId) return;
    const point = svgPoint(event.clientX, event.clientY);
    if (!point) return;
    setFixtures((items) => items.map((fixture) => fixture.id === drag.fixtureId ? {
      ...fixture,
      xMm: snap(point.x - drag.offsetX),
      yMm: snap(point.y - drag.offsetY),
    } : fixture));
  }

  function startVertexDrag(event: React.PointerEvent<SVGCircleElement>, vertexIndex: number) {
    if (!roomEditing || mode !== 'select') return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedFixtureId(null);
    setSelectedWall(null);
    setDrag({ kind: 'vertex', pointerId: event.pointerId, vertexIndex });
  }

  function moveVertex(event: React.PointerEvent<SVGCircleElement>) {
    if (!drag || drag.kind !== 'vertex' || drag.pointerId !== event.pointerId) return;
    const point = svgPoint(event.clientX, event.clientY);
    if (!point) return;
    setVertices((items) => {
      const previous = items[(drag.vertexIndex - 1 + items.length) % items.length];
      const next = items[(drag.vertexIndex + 1) % items.length];
      const snapped = snapPoint(point, [previous, next]);
      return items.map((item, index) => index === drag.vertexIndex ? snapped : item);
    });
  }

  function stopDrag(event: React.PointerEvent<SVGElement>) {
    if (drag?.pointerId === event.pointerId) setDrag(null);
  }

  function setWallLength(raw: string) {
    if (!roomEditing || selectedWall === null) return;
    const nextLength = parseMeasurement(raw, unit);
    if (!nextLength || nextLength < 100) return;
    setVertices((items) => {
      const start = items[selectedWall];
      const endIndex = (selectedWall + 1) % items.length;
      const end = items[endIndex];
      const current = distance(start, end);
      if (!current) return items;
      const replacement = {
        x: start.x + ((end.x - start.x) / current) * nextLength,
        y: start.y + ((end.y - start.y) / current) * nextLength,
      };
      return items.map((item, index) => index === endIndex ? replacement : item);
    });
  }

  function updateFixtureDimension(key: 'widthMm' | 'depthMm', raw: string) {
    if (!selectedFixture) return;
    const value = parseMeasurement(raw, unit);
    if (!value || value < 25) return;
    setFixtures((items) => items.map((fixture) => fixture.id === selectedFixture.id ? { ...fixture, [key]: value } : fixture));
  }

  function updateFixtureCoordinate(key: 'xMm' | 'yMm', raw: string) {
    if (!selectedFixture) return;
    const value = parseCoordinate(raw, unit);
    if (value === null) return;
    setFixtures((items) => items.map((fixture) => fixture.id === selectedFixture.id ? { ...fixture, [key]: value } : fixture));
  }

  function updateFixtureRotation(raw: string) {
    if (!selectedFixture) return;
    const value = Number(raw.replace(/[^0-9.+-]/g, ''));
    if (!Number.isFinite(value)) return;
    setFixtures((items) => items.map((fixture) => fixture.id === selectedFixture.id ? { ...fixture, rotationDeg: normalizeDegrees(value) } : fixture));
  }

  function wheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const factor = Math.exp(event.deltaY * 0.0012);
    const width = clamp(view.width * factor, 500, 200000);
    const height = view.height * (width / view.width);
    setView({ x: view.x + (view.width - width) / 2, y: view.y + (view.height - height) / 2, width, height });
  }

  const points = vertices.map((point) => `${point.x},${point.y}`).join(' ');
  const draftPoints = draft.map((point) => `${point.x},${point.y}`).join(' ');
  const saveText = workspace.status === 'saving' ? 'Saving…' : workspace.status === 'error' ? 'Save error' : workspace.hydrated ? 'Saved locally' : 'Loading…';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{workspace.activeHome?.name ?? 'Home'} / {activeProject?.name ?? 'Project'}</p>
          <h1>{roomName} · {activeDesign?.name ?? 'Design'}</h1>
        </div>
        <div className="topbar-actions">
          <span className="save-status">{saveText}</span>
          <label className="unit-picker">
            <span>Units</span>
            <select value={unit} onChange={(event) => changeUnit(event.target.value as DisplayUnit)}>
              <option value="ft-in">Feet + inches</option><option value="in">Inches</option><option value="ft">Decimal feet</option>
              <option value="mm">Millimeters</option><option value="cm">Centimeters</option><option value="m">Meters</option>
            </select>
          </label>
        </div>
      </header>

      <div className="design-tabs">
        {activeProject?.designs.map((design) => (
          <button key={design.id} className={design.id === activeDesign?.id ? 'active' : ''} type="button" onClick={() => switchDesign(design.id)}>
            {design.name}{design.kind === 'existing' ? ' · Existing' : ''}
          </button>
        ))}
        <button type="button" className="new-option" onClick={duplicateDesign}>+ Proposed option</button>
      </div>

      <main className="workspace">
        <aside className="tool-panel left-panel">
          {roomEditing ? <>
            <h2>Project room</h2>
            <p className="helper"><strong>{roomName}</strong> is being edited at the project level. Actual and every Proposal share this boundary.</p>
            <div className="mode-buttons">
              <button className={mode === 'select' ? 'active' : ''} onClick={() => { setMode('select'); setDraft([]); }}>Adjust</button>
              <button className={mode === 'draw' ? 'active' : ''} onClick={beginDraw}>Redraw</button>
              <button className={mode === 'pan' ? 'active' : ''} onClick={() => { setMode('pan'); setDraft([]); }}>Pan</button>
            </div>
            <h2>Rectangle shortcut</h2>
            <div className="field-grid">
              <label><span>Width</span><input value={widthInput} onChange={(event) => setWidthInput(event.target.value)} /></label>
              <label><span>Depth</span><input value={depthInput} onChange={(event) => setDepthInput(event.target.value)} /></label>
            </div>
            <button className="primary-action" type="button" onClick={createRectangle}>Use rectangle</button>
            <div className="property-actions"><button onClick={cancelRoomEdit}>Cancel</button><button onClick={finishRoomEdit}>Save room</button></div>
          </> : <>
            <h2>Layout tools</h2>
            <div className="mode-buttons">
              <button className={mode === 'select' ? 'active' : ''} onClick={() => { setMode('select'); setDraft([]); }}>Select</button>
              <button className={mode === 'pan' ? 'active' : ''} onClick={() => { setMode('pan'); setDraft([]); }}>Pan</button>
            </div>
            <p className="helper">The room boundary is locked to this project. Use Edit room in the project bar to change its name or shape.</p>
          </>}

          <h2>Fixed objects</h2>
          <div className="object-buttons">
            {presets.map((preset) => <button key={preset.name} onClick={() => addPreset(preset.name, preset.category, preset.widthIn, preset.depthIn)}>+ {preset.name}</button>)}
            <button type="button" onClick={openCustomObjectCreator}>+ Custom object</button>
          </div>

          {workspace.workspace.objectDefinitions.length > 0 && <>
            <h2>My objects</h2>
            <div className="object-buttons">
              {workspace.workspace.objectDefinitions.map((definition) => <button key={definition.id} onClick={() => addSavedObject(definition.id)}>+ {definition.name}</button>)}
            </div>
          </>}
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <span>{roomEditing ? `Editing ${roomName} · ${mode === 'draw' ? `${Math.max(0, draft.length - 1)} drawn line${draft.length === 2 ? '' : 's'}` : `${formatMeasurement(roomWidth, unit)} × ${formatMeasurement(roomDepth, unit)}`}` : `${roomName} · ${formatMeasurement(roomWidth, unit)} × ${formatMeasurement(roomDepth, unit)}`}</span>
            <div className="canvas-controls">
              {mode === 'draw' && <>
                <button type="button" onClick={undoLastDraftLine} disabled={draft.length < 2}>Undo line</button>
                <button type="button" onClick={clearDraft} disabled={draft.length === 0}>Clear</button>
              </>}
              {roomEditing && <button type="button" onClick={finishRoomEdit}>Done room</button>}
              <button type="button" onClick={() => fitToView()}>Fit</button>
            </div>
          </div>
          <svg ref={svgRef} className={`design-canvas mode-${mode} ${roomEditing ? 'room-editing' : 'room-locked'}`} viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`} onPointerDown={canvasPointerDown} onPointerMove={canvasPointerMove} onPointerUp={canvasPointerUp} onPointerCancel={canvasPointerUp} onWheel={wheel}>
            <defs><pattern id="minorGrid" width={GRID_MM * 6} height={GRID_MM * 6} patternUnits="userSpaceOnUse"><path d={`M ${GRID_MM * 6} 0 L 0 0 0 ${GRID_MM * 6}`} className="grid-line" fill="none" /></pattern></defs>
            <rect className="canvas-background" x={view.x} y={view.y} width={view.width} height={view.height} fill="url(#minorGrid)" />
            {vertices.length >= 3 && <polygon className="room-fill" points={points} />}
            {vertices.map((start, index) => {
              const end = vertices[(index + 1) % vertices.length];
              return <g key={`wall-${index}`}>
                <line className={`wall-line ${selectedWall === index ? 'selected' : ''}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} onPointerDown={(event) => { if (roomEditing && mode === 'select') { event.stopPropagation(); setSelectedWall(index); setSelectedFixtureId(null); } }} />
                <text className="dimension-label wall-dimension" x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 45} textAnchor="middle" pointerEvents="none">{formatMeasurement(distance(start, end), unit)}</text>
              </g>;
            })}
            {roomEditing && mode === 'select' && vertices.map((point, index) => <circle key={`vertex-${index}`} className="vertex-handle" cx={point.x} cy={point.y} r="55" onPointerDown={(event) => startVertexDrag(event, index)} onPointerMove={moveVertex} onPointerUp={stopDrag} onPointerCancel={stopDrag} />)}
            {draft.length > 0 && <g className="draft-shape"><polyline points={draftPoints} />{draft.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === 0 ? 80 : 55} className={index === 0 ? 'draft-start' : ''} />)}</g>}
            {fixtures.map((fixture) => {
              const cx = fixture.xMm + fixture.widthMm / 2;
              const cy = fixture.yMm + fixture.depthMm / 2;
              return <g key={fixture.id} transform={`rotate(${fixture.rotationDeg} ${cx} ${cy})`} className={`fixture ${fixture.id === selectedFixtureId ? 'selected' : ''}`} onPointerDown={(event) => startFixtureDrag(event, fixture)} onPointerMove={moveFixture} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
                <rect x={fixture.xMm} y={fixture.yMm} width={fixture.widthMm} height={fixture.depthMm} rx="35" />
                <text x={cx} y={cy - 20} textAnchor="middle">{fixture.name}</text>
                <text className="fixture-size" x={cx} y={cy + 55} textAnchor="middle">{formatMeasurement(fixture.widthMm, unit)} × {formatMeasurement(fixture.depthMm, unit)}</text>
              </g>;
            })}
          </svg>
        </section>

        <aside className={`tool-panel properties-panel ${selectedFixture || selectedWall !== null ? 'is-open' : ''}`}>
          {selectedFixture ? <>
            <div className="properties-heading"><div><p className="eyebrow">Selected object</p><h2>{selectedFixture.name}</h2></div><button className="icon-button" onClick={() => setSelectedFixtureId(null)}>×</button></div>
            <p className="helper">Drag this object on the drawing to place it. Use Precision only when you want exact coordinates.</p>
            <div className="field-grid">
              <label><span>Width</span><input key={`${selectedFixture.id}-w-${selectedFixture.widthMm}-${unit}`} defaultValue={valueForInput(selectedFixture.widthMm, unit)} onBlur={(event) => updateFixtureDimension('widthMm', event.target.value)} /></label>
              <label><span>Depth</span><input key={`${selectedFixture.id}-d-${selectedFixture.depthMm}-${unit}`} defaultValue={valueForInput(selectedFixture.depthMm, unit)} onBlur={(event) => updateFixtureDimension('depthMm', event.target.value)} /></label>
              <label><span>Rotation (degrees)</span><input inputMode="decimal" key={`${selectedFixture.id}-r-${selectedFixture.rotationDeg}`} defaultValue={String(selectedFixture.rotationDeg)} onBlur={(event) => updateFixtureRotation(event.target.value)} /></label>
            </div>
            <details className="precision-details">
              <summary>Precision</summary>
              <div className="field-grid">
                <label><span>X position</span><input key={`${selectedFixture.id}-x-${selectedFixture.xMm}-${unit}`} defaultValue={valueForCoordinateInput(selectedFixture.xMm, unit)} onBlur={(event) => updateFixtureCoordinate('xMm', event.target.value)} /></label>
                <label><span>Y position</span><input key={`${selectedFixture.id}-y-${selectedFixture.yMm}-${unit}`} defaultValue={valueForCoordinateInput(selectedFixture.yMm, unit)} onBlur={(event) => updateFixtureCoordinate('yMm', event.target.value)} /></label>
              </div>
            </details>
            <div className="property-actions">
              <button onClick={() => setFixtures((items) => items.map((item) => item.id === selectedFixture.id ? { ...item, rotationDeg: (item.rotationDeg + 90) % 360 } : item))}>Rotate 90°</button>
              <button onClick={duplicateSelectedFixture}>Duplicate</button>
              <button className="danger" onClick={() => { setFixtures((items) => items.filter((item) => item.id !== selectedFixture.id)); setSelectedFixtureId(null); }}>Delete</button>
            </div>
            <button className="primary-action" type="button" onClick={saveSelectedObject}>{selectedFixture.definitionId ? 'Update My Object' : 'Save to My Objects'}</button>
          </> : selectedWall !== null && wallLength !== null ? <>
            <div className="properties-heading"><div><p className="eyebrow">Selected wall</p><h2>Wall {selectedWall + 1}</h2></div><button className="icon-button" onClick={() => setSelectedWall(null)}>×</button></div>
            <div className="field-grid"><label><span>Exact length</span><input key={`${selectedWall}-${wallLength}-${unit}`} defaultValue={valueForInput(wallLength, unit)} onBlur={(event) => setWallLength(event.target.value)} /></label></div>
          </> : <div className="empty-properties"><h2>Select a wall or object</h2><p>Changes autosave locally. Create a Proposed option to branch from the current design.</p></div>}
        </aside>
      </main>

      {customObjectOpen && <div className="custom-object-backdrop" onPointerDown={() => setCustomObjectOpen(false)}>
        <section className="custom-object-sheet" role="dialog" aria-modal="true" aria-labelledby="custom-object-title" onPointerDown={(event) => event.stopPropagation()}>
          <div className="custom-object-heading">
            <div><p className="eyebrow">New object</p><h2 id="custom-object-title">Create custom object</h2></div>
            <button type="button" className="icon-button" aria-label="Close custom object" onClick={() => setCustomObjectOpen(false)}>×</button>
          </div>
          <p className="helper">Name it and set its size. It will appear in the center of your current view, ready to drag into place.</p>
          <label className="custom-object-field"><span>Name</span><input autoFocus aria-label="Custom object name" value={customName} onChange={(event) => { setCustomName(event.target.value); setCustomObjectError(''); }} placeholder="e.g. Linen cabinet" /></label>
          <div className="custom-object-dimensions">
            <label className="custom-object-field"><span>Width</span><input aria-label="Custom object width" value={customWidthInput} onChange={(event) => { setCustomWidthInput(event.target.value); setCustomObjectError(''); }} /></label>
            <label className="custom-object-field"><span>Depth</span><input aria-label="Custom object depth" value={customDepthInput} onChange={(event) => { setCustomDepthInput(event.target.value); setCustomObjectError(''); }} /></label>
          </div>
          {customObjectError && <p className="custom-object-error" role="alert">{customObjectError}</p>}
          <div className="custom-object-actions">
            <button type="button" className="secondary-button" onClick={() => setCustomObjectOpen(false)}>Cancel</button>
            <button type="button" className="primary-action" onClick={createCustomObject}>Create object</button>
          </div>
        </section>
      </div>}

      <nav className="mobile-actions">
        {roomEditing ? <>
          <button className={mode === 'select' ? 'active' : ''} onClick={() => { setMode('select'); setDraft([]); }}>Adjust</button>
          <button className={mode === 'draw' ? 'active' : ''} onClick={beginDraw}>Redraw</button>
          <button className={mode === 'pan' ? 'active' : ''} onClick={() => { setMode('pan'); setDraft([]); }}>Pan</button>
          <button type="button" onClick={finishRoomEdit}>Done</button>
        </> : <>
          <button className={mode === 'select' ? 'active' : ''} onClick={() => { setMode('select'); setDraft([]); }}>Select</button>
          <button className={mode === 'pan' ? 'active' : ''} onClick={() => { setMode('pan'); setDraft([]); }}>Pan</button>
          <button type="button" onClick={openCustomObjectCreator}>+ Object</button>
          <button type="button" onClick={() => fitToView()}>Fit</button>
        </>}
      </nav>
    </div>
  );
}
