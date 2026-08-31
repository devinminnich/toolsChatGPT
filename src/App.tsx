import { useMemo, useRef, useState } from 'react';
import { DisplayUnit, formatMeasurement, inchesToMm, parseMeasurement, valueForInput } from './lib/units';

type Fixture = {
  id: string;
  name: string;
  widthMm: number;
  depthMm: number;
  xMm: number;
  yMm: number;
  rotationDeg: number;
};

type DragState = {
  fixtureId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

const INITIAL_WIDTH = inchesToMm(172);
const INITIAL_DEPTH = inchesToMm(92);

const fixturePresets = [
  { name: 'Toilet', widthIn: 18, depthIn: 30 },
  { name: 'Shower', widthIn: 60, depthIn: 36 },
  { name: 'Vanity', widthIn: 48, depthIn: 22 },
  { name: 'Custom', widthIn: 24, depthIn: 24 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function App() {
  const [unit, setUnit] = useState<DisplayUnit>('ft-in');
  const [roomWidthMm, setRoomWidthMm] = useState(INITIAL_WIDTH);
  const [roomDepthMm, setRoomDepthMm] = useState(INITIAL_DEPTH);
  const [widthInput, setWidthInput] = useState(valueForInput(INITIAL_WIDTH, 'ft-in'));
  const [depthInput, setDepthInput] = useState(valueForInput(INITIAL_DEPTH, 'ft-in'));
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const selected = fixtures.find((fixture) => fixture.id === selectedId) ?? null;

  const padding = 240;
  const viewBox = useMemo(() => `0 0 ${roomWidthMm + padding * 2} ${roomDepthMm + padding * 2}`, [roomWidthMm, roomDepthMm]);

  function commitRoomDimension(kind: 'width' | 'depth') {
    const input = kind === 'width' ? widthInput : depthInput;
    const parsed = parseMeasurement(input, unit);
    if (!parsed || parsed < 300) return;
    if (kind === 'width') {
      setRoomWidthMm(parsed);
      setWidthInput(valueForInput(parsed, unit));
    } else {
      setRoomDepthMm(parsed);
      setDepthInput(valueForInput(parsed, unit));
    }
  }

  function changeUnit(next: DisplayUnit) {
    setUnit(next);
    setWidthInput(valueForInput(roomWidthMm, next));
    setDepthInput(valueForInput(roomDepthMm, next));
  }

  function addFixture(name: string, widthIn: number, depthIn: number) {
    const fixture: Fixture = {
      id: crypto.randomUUID(),
      name,
      widthMm: inchesToMm(widthIn),
      depthMm: inchesToMm(depthIn),
      xMm: roomWidthMm / 2 - inchesToMm(widthIn) / 2,
      yMm: roomDepthMm / 2 - inchesToMm(depthIn) / 2,
      rotationDeg: 0,
    };
    setFixtures((items) => [...items, fixture]);
    setSelectedId(fixture.id);
  }

  function svgPoint(event: React.PointerEvent<SVGElement>) {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x - padding, y: transformed.y - padding };
  }

  function startFixtureDrag(event: React.PointerEvent<SVGGElement>, fixture: Fixture) {
    event.stopPropagation();
    const point = svgPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(fixture.id);
    setDragState({
      fixtureId: fixture.id,
      pointerId: event.pointerId,
      offsetX: point.x - fixture.xMm,
      offsetY: point.y - fixture.yMm,
    });
  }

  function moveFixture(event: React.PointerEvent<SVGGElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const point = svgPoint(event);
    if (!point) return;
    setFixtures((items) => items.map((fixture) => {
      if (fixture.id !== dragState.fixtureId) return fixture;
      return {
        ...fixture,
        xMm: clamp(point.x - dragState.offsetX, -fixture.widthMm / 2, roomWidthMm - fixture.widthMm / 2),
        yMm: clamp(point.y - dragState.offsetY, -fixture.depthMm / 2, roomDepthMm - fixture.depthMm / 2),
      };
    }));
  }

  function stopFixtureDrag(event: React.PointerEvent<SVGGElement>) {
    if (dragState?.pointerId === event.pointerId) setDragState(null);
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
          <h2>Room</h2>
          <div className="field-grid">
            <label>
              <span>Width</span>
              <input value={widthInput} onChange={(e) => setWidthInput(e.target.value)} onBlur={() => commitRoomDimension('width')} onKeyDown={(e) => e.key === 'Enter' && commitRoomDimension('width')} />
            </label>
            <label>
              <span>Depth</span>
              <input value={depthInput} onChange={(e) => setDepthInput(e.target.value)} onBlur={() => commitRoomDimension('depth')} onKeyDown={(e) => e.key === 'Enter' && commitRoomDimension('depth')} />
            </label>
          </div>

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
            <span>{formatMeasurement(roomWidthMm, unit)} × {formatMeasurement(roomDepthMm, unit)}</span>
            <span>{fixtures.length} fixed object{fixtures.length === 1 ? '' : 's'}</span>
          </div>
          <svg
            ref={svgRef}
            className="design-canvas"
            viewBox={viewBox}
            role="img"
            aria-label="Dimensioned room layout"
            onPointerDown={() => setSelectedId(null)}
          >
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" className="grid-line" fill="none" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
            <g transform={`translate(${padding} ${padding})`}>
              <rect className="room-fill" x="0" y="0" width={roomWidthMm} height={roomDepthMm} />
              <rect className="room-outline" x="0" y="0" width={roomWidthMm} height={roomDepthMm} />

              <text className="dimension-label" x={roomWidthMm / 2} y={-70} textAnchor="middle">{formatMeasurement(roomWidthMm, unit)}</text>
              <text className="dimension-label" x={-80} y={roomDepthMm / 2} textAnchor="middle" transform={`rotate(-90 -80 ${roomDepthMm / 2})`}>{formatMeasurement(roomDepthMm, unit)}</text>

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
                    onPointerUp={stopFixtureDrag}
                    onPointerCancel={stopFixtureDrag}
                  >
                    <rect x={fixture.xMm} y={fixture.yMm} width={fixture.widthMm} height={fixture.depthMm} rx="35" />
                    <text x={cx} y={cy - 20} textAnchor="middle">{fixture.name}</text>
                    <text className="fixture-size" x={cx} y={cy + 55} textAnchor="middle">{formatMeasurement(fixture.widthMm, unit)} × {formatMeasurement(fixture.depthMm, unit)}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </section>

        <aside className={`tool-panel properties-panel ${selected ? 'is-open' : ''}`}>
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
              <p className="helper">Drag this object anywhere on the plan. Exact dimensions remain attached to the object.</p>
            </>
          ) : (
            <div className="empty-properties">
              <h2>Select an object</h2>
              <p>Tap or click a fixed object to edit its dimensions, rotate it, or remove it.</p>
            </div>
          )}
        </aside>
      </main>

      <nav className="mobile-actions" aria-label="Add fixed object">
        {fixturePresets.slice(0, 3).map((preset) => (
          <button key={preset.name} type="button" onClick={() => addFixture(preset.name, preset.widthIn, preset.depthIn)}>+ {preset.name}</button>
        ))}
      </nav>
    </div>
  );
}
