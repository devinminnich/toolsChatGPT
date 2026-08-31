import { useMemo, useRef, useState } from 'react';
import { DisplayUnit, formatMeasurement, inchesToMm, parseMeasurement, valueForInput } from './lib/units';

type Point = { x: number; y: number };
type ViewBox = { x: number; y: number; width: number; height: number };
type Mode = 'select' | 'draw' | 'pan';

type Fixture = {
  id: string;
  name: string;
  widthMm: number;
  depthMm: number;
  xMm: number;
  yMm: number;
  rotationDeg: number;
};

type FixtureDrag = {
  kind: 'fixture';
  fixtureId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

type VertexDrag = {
  kind: 'vertex';
  vertexIndex: number;
  pointerId: number;
};

type DragState = FixtureDrag | VertexDrag | null;

type PanState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startView: ViewBox;
};

type PinchState = {
  distance: number;
  midpointX: number;
  midpointY: number;
  startView: ViewBox;
};

const INITIAL_WIDTH = inchesToMm(172);
const INITIAL_DEPTH = inchesToMm(92);
const GRID_MM = inchesToMm(1);
const SNAP_MM = inchesToMm(3);
const CLOSE_MM = inchesToMm(6);

const fixturePresets = [
  { name: 'Toilet', widthIn: 18, depthIn: 30 },
  { name: 'Shower', widthIn: 60, depthIn: 36 },
  { name: 'Vanity', widthIn: 48, depthIn: 22 },
  { name: 'Custom', widthIn: 24, depthIn: 24 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function rectangleVertices(width: number, depth: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: depth },
    { x: 0, y: depth },
  ];
}

function polygonBounds(points: Point[]) {
  if (!points.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  return points.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxX: Math.max(acc.maxX, point.x),
      maxY: Math.max(acc.maxY, point.y),
    }),
    { minX: points[0].x, minY: points[0].y, maxX: points[0].x, maxY: points[0].y },
  );
}

function snapToGrid(value: number) {
  return Math.round(value / GRID_MM) * GRID_MM;
}

function snapPoint(point: Point, anchors: Point[] = []): Point {
  let snapped = { x: snapToGrid(point.x), y: snapToGrid(point.y) };

  for (const anchor of anchors) {
    if (Math.abs(point.x - anchor.x) <= SNAP_MM) snapped.x = anchor.x;
    if (Math.abs(point.y - anchor.y) <= SNAP_MM) snapped.y = anchor.y;
  }

  return snapped;
}

function snapNewWall(point: Point, previous: Point): Point {
  const dx = point.x - previous.x;
  const dy = point.y - previous.y;
  const angle = Math.atan2(dy, dx);
  const distanceFromPrevious = Math.hypot(dx, dy);
  const fortyFive = Math.PI / 4;
  const snappedAngle = Math.round(angle / fortyFive) * fortyFive;
  const angleDelta = Math.abs(Math.atan2(Math.sin(angle - snappedAngle), Math.cos(angle - snappedAngle)));

  if (angleDelta <= (8 * Math.PI) / 180) {
    return snapPoint({
      x: previous.x + Math.cos(snappedAngle) * distanceFromPrevious,
      y: previous.y + Math.sin(snappedAngle) * distanceFromPrevious,
    }, [previous]);
  }

  return snapPoint(point, [previous]);
}

export default function App() {
  const [unit, setUnit] = useState<DisplayUnit>('ft-in');
  const [widthInput, setWidthInput] = useState(valueForInput(INITIAL_WIDTH, 'ft-in'));
  const [depthInput, setDepthInput] = useState(valueForInput(INITIAL_DEPTH, 'ft-in'));
  const [vertices, setVertices] = useState<Point[]>(rectangleVertices(INITIAL_WIDTH, INITIAL_DEPTH));
  const [draftVertices, setDraftVertices] = useState<Point[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWall, setSelectedWall] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('select');
  const [dragState, setDragState] = useState<DragState>(null);
  const [view, setView] = useState<ViewBox>({
    x: -600,
    y: -600,
    width: INITIAL_WIDTH + 1200,
    height: INITIAL_DEPTH + 1200,
  });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<PanState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const tapStartRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);

  const selected = fixtures.find((fixture) => fixture.id === selectedId) ?? null;
  const bounds = useMemo(() => polygonBounds(vertices), [vertices]);
  const roomWidthMm = bounds.maxX - bounds.minX;
  const roomDepthMm = bounds.maxY - bounds.minY;

  function svgPointFromClient(clientX: number, clientY: number): Point | null {
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

  function svgPoint(event: React.PointerEvent<SVGElement>) {
    return svgPointFromClient(event.clientX, event.clientY);
  }

  function changeUnit(next: DisplayUnit) {
    setUnit(next);
    setWidthInput(valueForInput(roomWidthMm, next));
    setDepthInput(valueForInput(roomDepthMm, next));
  }

  function createRectangle() {
    const width = parseMeasurement(widthInput, unit);
    const depth = parseMeasurement(depthInput, unit);
    if (!width || !depth || width < 300 || depth < 300) return;
    setVertices(rectangleVertices(width, depth));
    setDraftVertices([]);
    setSelectedWall(null);
    setSelectedId(null);
    requestAnimationFrame(() => fitToView(rectangleVertices(width, depth)));
  }

  function fitToView(points = vertices) {
    const nextBounds = polygonBounds(points);
    const width = Math.max(nextBounds.maxX - nextBounds.minX, 1000);
    const height = Math.max(nextBounds.maxY - nextBounds.minY, 1000);
    const pad = Math.max(width, height) * 0.16 + 250;
    setView({
      x: nextBounds.minX - pad,
      y: nextBounds.minY - pad,
      width: width + pad * 2,
      height: height + pad * 2,
    });
  }

  function addFixture(name: string, widthIn: number, depthIn: number) {
    const fixture: Fixture = {
      id: crypto.randomUUID(),
      name,
      widthMm: inchesToMm(widthIn),
      depthMm: inchesToMm(depthIn),
      xMm: bounds.minX + roomWidthMm / 2 - inchesToMm(widthIn) / 2,
      yMm: bounds.minY + roomDepthMm / 2 - inchesToMm(depthIn) / 2,
      rotationDeg: 0,
    };
    setFixtures((items) => [...items, fixture]);
    setSelectedId(fixture.id);
    setSelectedWall(null);
    setMode('select');
  }

  function beginDraw() {
    setMode('draw');
    setDraftVertices([]);
    setSelectedId(null);
    setSelectedWall(null);
  }

  function cancelDraw() {
    setDraftVertices([]);
    setMode('select');
  }

  function finishDraw(points: Point[]) {
    if (points.length < 3) return;
    setVertices(points);
    setDraftVertices([]);
    setMode('select');
    setWidthInput(valueForInput(polygonBounds(points).maxX - polygonBounds(points).minX, unit));
    setDepthInput(valueForInput(polygonBounds(points).maxY - polygonBounds(points).minY, unit));
    requestAnimationFrame(() => fitToView(points));
  }

  function addDrawPoint(rawPoint: Point) {
    if (draftVertices.length === 0) {
      setDraftVertices([snapPoint(rawPoint)]);
      return;
    }

    const first = draftVertices[0];
    const previous = draftVertices[draftVertices.length - 1];
    if (draftVertices.length >= 3 && distance(rawPoint, first) <= CLOSE_MM) {
      finishDraw(draftVertices);
      return;
    }

    const point = snapNewWall(rawPoint, previous);
    if (distance(point, previous) < GRID_MM) return;
    setDraftVertices((items) => [...items, point]);
  }

  function startFixtureDrag(event: React.PointerEvent<SVGGElement>, fixture: Fixture) {
    if (mode !== 'select') return;
    event.stopPropagation();
    const point = svgPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(fixture.id);
    setSelectedWall(null);
    setDragState({
      kind: 'fixture',
      fixtureId: fixture.id,
      pointerId: event.pointerId,
      offsetX: point.x - fixture.xMm,
      offsetY: point.y - fixture.yMm,
    });
  }

  function moveFixture(event: React.PointerEvent<SVGGElement>) {
    if (!dragState || dragState.kind !== 'fixture' || dragState.pointerId !== event.pointerId) return;
    const point = svgPoint(event);
    if (!point) return;
    setFixtures((items) => items.map((fixture) => fixture.id === dragState.fixtureId ? {
      ...fixture,
      xMm: snapToGrid(point.x - dragState.offsetX),
      yMm: snapToGrid(point.y - dragState.offsetY),
    } : fixture));
  }

  function startVertexDrag(event: React.PointerEvent<SVGCircleElement>, vertexIndex: number) {
    if (mode !== 'select') return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(null);
    setSelectedWall(null);
    setDragState({ kind: 'vertex', vertexIndex, pointerId: event.pointerId });
  }

  function moveVertex(event: React.PointerEvent<SVGCircleElement>) {
    if (!dragState || dragState.kind !== 'vertex' || dragState.pointerId !== event.pointerId) return;
    const point = svgPoint(event);
    if (!point) return;
    setVertices((items) => {
      const previous = items[(dragState.vertexIndex - 1 + items.length) % items.length];
      const next = items[(dragState.vertexIndex + 1) % items.length];
      const snapped = snapPoint(point, [previous, next]);
      return items.map((item, index) => index === dragState.vertexIndex ? snapped : item);
    });
  }

  function stopDrag(event: React.PointerEvent<SVGElement>) {
    if (dragState?.pointerId === event.pointerId) setDragState(null);
  }

  function selectWall(event: React.PointerEvent<SVGLineElement>, wallIndex: number) {
    if (mode !== 'select') return;
    event.stopPropagation();
    setSelectedWall(wallIndex);
    setSelectedId(null);
  }

  function updateWallLength(raw: string) {
    if (selectedWall === null) return;
    const length = parseMeasurement(raw, unit);
    if (!length || length < 100) return;
    setVertices((items) => {
      const startIndex = selectedWall;
      const endIndex = (selectedWall + 1) % items.length;
      const start = items[startIndex];
      const end = items[endIndex];
      const current = distance(start, end);
      if (!current) return items;
      const nextEnd = {
        x: start.x + ((end.x - start.x) / current) * length,
        y: start.y + ((end.y - start.y) / current) * length,
      };
      return items.map((item, index) => index === endIndex ? nextEnd : item);
    });
  }

  function updateSelectedDimension(kind: 'widthMm' | 'depthMm', raw: string) {
    if (!selected) return;
    const parsed = parseMeasurement(raw, unit);
    if (!parsed || parsed < 25) return;
    setFixtures((items) => items.map((fixture) => fixture.id === selected.id ? { ...fixture, [kind]: parsed } : fixture));
  }

  function rotateSelected() {
    if (!selected) return;
    setFixtures((items) => items.map((fixture) => fixture.id === selected.id ? { ...fixture, rotationDeg: (fixture.rotationDeg + 90) % 360 } : fixture));
  }

  function deleteSelected() {
    if (!selected) return;
    setFixtures((items) => items.filter((fixture) => fixture.id !== selected.id));
    setSelectedId(null);
  }

  function startCanvasPointer(event: React.PointerEvent<SVGSVGElement>) {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(b.x - a.x, b.y - a.y),
        midpointX: (a.x + b.x) / 2,
        midpointY: (a.y + b.y) / 2,
        startView: view,
      };
      tapStartRef.current = null;
      panRef.current = null;
      return;
    }

    if (mode === 'pan' || event.button === 1) {
      panRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startView: view,
      };
      return;
    }

    tapStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  }

  function moveCanvasPointer(event: React.PointerEvent<SVGSVGElement>) {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (tapStartRef.current?.pointerId === event.pointerId) {
      if (Math.hypot(event.clientX - tapStartRef.current.x, event.clientY - tapStartRef.current.y) > 8) {
        tapStartRef.current.moved = true;
      }
    }

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const currentDistance = Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1);
      const ratio = pinchRef.current.distance / currentDistance;
      const nextWidth = clamp(pinchRef.current.startView.width * ratio, 500, 200000);
      const nextHeight = pinchRef.current.startView.height * (nextWidth / pinchRef.current.startView.width);
      const midpointX = (a.x + b.x) / 2;
      const midpointY = (a.y + b.y) / 2;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dxPx = midpointX - pinchRef.current.midpointX;
      const dyPx = midpointY - pinchRef.current.midpointY;
      setView({
        x: pinchRef.current.startView.x - (dxPx / rect.width) * pinchRef.current.startView.width + (pinchRef.current.startView.width - nextWidth) / 2,
        y: pinchRef.current.startView.y - (dyPx / rect.height) * pinchRef.current.startView.height + (pinchRef.current.startView.height - nextHeight) / 2,
        width: nextWidth,
        height: nextHeight,
      });
      return;
    }

    const pan = panRef.current;
    if (pan?.pointerId === event.pointerId) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((event.clientX - pan.startClientX) / rect.width) * pan.startView.width;
      const dy = ((event.clientY - pan.startClientY) / rect.height) * pan.startView.height;
      setView({ ...pan.startView, x: pan.startView.x - dx, y: pan.startView.y - dy });
    }
  }

  function endCanvasPointer(event: React.PointerEvent<SVGSVGElement>) {
    const tap = tapStartRef.current;
    const wasPinching = Boolean(pinchRef.current);

    if (mode === 'draw' && tap?.pointerId === event.pointerId && !tap.moved && !wasPinching) {
      const point = svgPointFromClient(event.clientX, event.clientY);
      if (point) addDrawPoint(point);
    } else if (mode === 'select' && tap?.pointerId === event.pointerId && !tap.moved && !wasPinching) {
      setSelectedId(null);
      setSelectedWall(null);
    }

    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
    if (tapStartRef.current?.pointerId === event.pointerId) tapStartRef.current = null;
  }

  function zoomAtCenter(factor: number) {
    const nextWidth = clamp(view.width * factor, 500, 200000);
    const nextHeight = view.height * (nextWidth / view.width);
    setView({
      x: view.x + (view.width - nextWidth) / 2,
      y: view.y + (view.height - nextHeight) / 2,
      width: nextWidth,
      height: nextHeight,
    });
  }

  function wheelZoom(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const point = svgPointFromClient(event.clientX, event.clientY);
    if (!point) return;
    const factor = Math.exp(event.deltaY * 0.0012);
    const nextWidth = clamp(view.width * factor, 500, 200000);
    const nextHeight = view.height * (nextWidth / view.width);
    const ratio = nextWidth / view.width;
    setView({
      x: point.x - (point.x - view.x) * ratio,
      y: point.y - (point.y - view.y) * ratio,
      width: nextWidth,
      height: nextHeight,
    });
  }

  const polygonPoints = vertices.map((point) => `${point.x},${point.y}`).join(' ');
  const draftPoints = draftVertices.map((point) => `${point.x},${point.y}`).join(' ');
  const wallLength = selectedWall === null ? null : distance(vertices[selectedWall], vertices[(selectedWall + 1) % vertices.length]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">My House / Primary Bathroom</p>
          <h1>Existing layout</h1>
        </div>
        <label className="unit-picker">
          <span>Units</span>
          <select value={unit} onChange={(event) => changeUnit(event.target.value as DisplayUnit)}>
            <option value="ft-in">Feet + inches</option>
            <option value="in">Inches</option>
            <option value="ft">Decimal feet</option>
            <option value="mm">Millimeters</option>
            <option value="cm">Centimeters</option>
            <option value="m">Meters</option>
          </select>
        </label>
      </header>

      <main className="workspace">
        <aside className="tool-panel left-panel">
          <h2>Room shape</h2>
          <div className="mode-buttons">
            <button className={mode === 'select' ? 'active' : ''} type="button" onClick={() => { setMode('select'); setDraftVertices([]); }}>Select</button>
            <button className={mode === 'draw' ? 'active' : ''} type="button" onClick={beginDraw}>Draw walls</button>
            <button className={mode === 'pan' ? 'active' : ''} type="button" onClick={() => { setMode('pan'); setDraftVertices([]); }}>Pan</button>
          </div>

          <p className="helper">Draw any closed shape. New walls snap to the 1-inch grid, nearby axes, and common 45° angles.</p>

          <h2>Rectangle shortcut</h2>
          <div className="field-grid">
            <label>
              <span>Width</span>
              <input value={widthInput} onChange={(e) => setWidthInput(e.target.value)} />
            </label>
            <label>
              <span>Depth</span>
              <input value={depthInput} onChange={(e) => setDepthInput(e.target.value)} />
            </label>
          </div>
          <button className="primary-action" type="button" onClick={createRectangle}>Create rectangle</button>

          {mode === 'draw' && (
            <div className="draw-status">
              <strong>Drawing walls</strong>
              <span>{draftVertices.length === 0 ? 'Tap/click the first corner.' : 'Continue corners, then tap the first point to close.'}</span>
              <button type="button" onClick={cancelDraw}>Cancel drawing</button>
            </div>
          )}

          <h2>Fixed objects</h2>
          <div className="object-buttons">
            {fixturePresets.map((preset) => (
              <button key={preset.name} type="button" onClick={() => addFixture(preset.name, preset.widthIn, preset.depthIn)}>
                + {preset.name}
              </button>
            ))}
          </div>
        </aside>

        <section className="canvas-panel" aria-label="Room design canvas">
          <div className="canvas-toolbar">
            <span>{formatMeasurement(roomWidthMm, unit)} × {formatMeasurement(roomDepthMm, unit)} envelope</span>
            <div className="canvas-controls">
              <button type="button" onClick={() => zoomAtCenter(0.8)} aria-label="Zoom in">+</button>
              <button type="button" onClick={() => zoomAtCenter(1.25)} aria-label="Zoom out">−</button>
              <button type="button" onClick={() => fitToView()}>Fit</button>
            </div>
          </div>
          <svg
            ref={svgRef}
            className={`design-canvas mode-${mode}`}
            viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
            role="img"
            aria-label="Dimensioned room layout"
            onPointerDown={startCanvasPointer}
            onPointerMove={moveCanvasPointer}
            onPointerUp={endCanvasPointer}
            onPointerCancel={endCanvasPointer}
            onWheel={wheelZoom}
          >
            <defs>
              <pattern id="minorGrid" width={GRID_MM * 6} height={GRID_MM * 6} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID_MM * 6} 0 L 0 0 0 ${GRID_MM * 6}`} className="grid-line" fill="none" />
              </pattern>
            </defs>
            <rect className="canvas-background" x={view.x} y={view.y} width={view.width} height={view.height} fill="url(#minorGrid)" />

            {vertices.length >= 3 && <polygon className="room-fill" points={polygonPoints} />}

            {vertices.map((start, index) => {
              const end = vertices[(index + 1) % vertices.length];
              const active = selectedWall === index;
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              return (
                <g key={`wall-${index}`}>
                  <line
                    className={`wall-line ${active ? 'selected' : ''}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    onPointerDown={(event) => selectWall(event, index)}
                    style={{ pointerEvents: mode === 'select' ? 'stroke' : 'none' }}
                  />
                  <text className="dimension-label wall-dimension" x={midX} y={midY - 45} textAnchor="middle" pointerEvents="none">
                    {formatMeasurement(distance(start, end), unit)}
                  </text>
                </g>
              );
            })}

            {mode === 'select' && vertices.map((point, index) => (
              <circle
                key={`vertex-${index}`}
                className="vertex-handle"
                cx={point.x}
                cy={point.y}
                r="55"
                onPointerDown={(event) => startVertexDrag(event, index)}
                onPointerMove={moveVertex}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
              />
            ))}

            {draftVertices.length > 0 && (
              <g className="draft-shape">
                <polyline points={draftPoints} />
                {draftVertices.map((point, index) => (
                  <circle key={`draft-${index}`} cx={point.x} cy={point.y} r={index === 0 ? 80 : 55} className={index === 0 ? 'draft-start' : ''} />
                ))}
              </g>
            )}

            {fixtures.map((fixture) => {
              const active = fixture.id === selectedId;
              const cx = fixture.xMm + fixture.widthMm / 2;
              const cy = fixture.yMm + fixture.depthMm / 2;
              return (
                <g
                  key={fixture.id}
                  transform={`rotate(${fixture.rotationDeg} ${cx} ${cy})`}
                  className={`fixture ${active ? 'selected' : ''}`}
                  onPointerDown={(event) => startFixtureDrag(event, fixture)}
                  onPointerMove={moveFixture}
                  onPointerUp={stopDrag}
                  onPointerCancel={stopDrag}
                  style={{ pointerEvents: mode === 'select' ? 'auto' : 'none' }}
                >
                  <rect x={fixture.xMm} y={fixture.yMm} width={fixture.widthMm} height={fixture.depthMm} rx="35" />
                  <text x={cx} y={cy - 20} textAnchor="middle">{fixture.name}</text>
                  <text className="fixture-size" x={cx} y={cy + 55} textAnchor="middle">{formatMeasurement(fixture.widthMm, unit)} × {formatMeasurement(fixture.depthMm, unit)}</text>
                </g>
              );
            })}
          </svg>
        </section>

        <aside className={`tool-panel properties-panel ${selected || selectedWall !== null ? 'is-open' : ''}`}>
          {selected ? (
            <>
              <div className="properties-heading">
                <div>
                  <p className="eyebrow">Selected object</p>
                  <h2>{selected.name}</h2>
                </div>
                <button className="icon-button" type="button" onClick={() => setSelectedId(null)} aria-label="Close properties">×</button>
              </div>
              <div className="field-grid">
                <label>
                  <span>Width</span>
                  <input defaultValue={valueForInput(selected.widthMm, unit)} key={`${selected.id}-w-${selected.widthMm}-${unit}`} onBlur={(e) => updateSelectedDimension('widthMm', e.target.value)} />
                </label>
                <label>
                  <span>Depth</span>
                  <input defaultValue={valueForInput(selected.depthMm, unit)} key={`${selected.id}-d-${selected.depthMm}-${unit}`} onBlur={(e) => updateSelectedDimension('depthMm', e.target.value)} />
                </label>
              </div>
              <div className="property-actions">
                <button type="button" onClick={rotateSelected}>Rotate 90°</button>
                <button className="danger" type="button" onClick={deleteSelected}>Delete</button>
              </div>
              <p className="helper">Drag anywhere on the plan. Exact dimensions stay attached to this object.</p>
            </>
          ) : selectedWall !== null && wallLength !== null ? (
            <>
              <div className="properties-heading">
                <div>
                  <p className="eyebrow">Selected wall</p>
                  <h2>Wall {selectedWall + 1}</h2>
                </div>
                <button className="icon-button" type="button" onClick={() => setSelectedWall(null)} aria-label="Close properties">×</button>
              </div>
              <div className="field-grid">
                <label>
                  <span>Exact length</span>
                  <input
                    key={`wall-${selectedWall}-${wallLength}-${unit}`}
                    defaultValue={valueForInput(wallLength, unit)}
                    onBlur={(event) => updateWallLength(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Enter') updateWallLength(event.currentTarget.value); }}
                  />
                </label>
              </div>
              <p className="helper">Changing the wall length moves its ending corner while preserving the wall's current angle.</p>
            </>
          ) : (
            <div className="empty-properties">
              <h2>Select a wall or object</h2>
              <p>Tap/click a wall for exact length, a corner to drag it, or a fixed object to edit its size.</p>
            </div>
          )}
        </aside>
      </main>

      <nav className="mobile-actions" aria-label="Design tools">
        <button className={mode === 'select' ? 'active' : ''} type="button" onClick={() => { setMode('select'); setDraftVertices([]); }}>Select</button>
        <button className={mode === 'draw' ? 'active' : ''} type="button" onClick={beginDraw}>Draw</button>
        <button className={mode === 'pan' ? 'active' : ''} type="button" onClick={() => { setMode('pan'); setDraftVertices([]); }}>Pan</button>
        <button type="button" onClick={() => addFixture('Custom', 24, 24)}>+ Object</button>
      </nav>
    </div>
  );
}
