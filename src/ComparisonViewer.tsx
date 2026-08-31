import { useMemo, useState } from 'react';
import { boundsViewBox, combinedDesignBounds } from './domain/comparisonGeometry';
import type { Design } from './domain/project';

function polygon(design: Design) {
  return design.vertices.map((point) => `${point.x},${point.y}`).join(' ');
}

function DesignLayer({ design, className }: { design: Design; className: string }) {
  return <g className={className}>
    {design.vertices.length >= 3 && <polygon className="compare-room" points={polygon(design)} />}
    {design.fixtures.map((fixture) => {
      const cx = fixture.xMm + fixture.widthMm / 2;
      const cy = fixture.yMm + fixture.depthMm / 2;
      return <g key={fixture.id} className="compare-fixture" transform={`rotate(${fixture.rotationDeg} ${cx} ${cy})`}>
        <rect x={fixture.xMm} y={fixture.yMm} width={fixture.widthMm} height={fixture.depthMm} rx="30" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">{fixture.name}</text>
      </g>;
    })}
  </g>;
}

export default function ComparisonViewer({ existing, proposed }: { existing: Design; proposed: Design }) {
  const [split, setSplit] = useState(50);
  const bounds = useMemo(() => combinedDesignBounds(existing, proposed), [existing, proposed]);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const clipWidth = width * split / 100;
  const splitX = bounds.minX + clipWidth;

  return <section className="review-card comparison-viewer-card">
    <div className="comparison-viewer-heading">
      <div><h3>Visual comparison</h3><p className="muted">Drag the slider to reveal Existing versus Proposed.</p></div>
      <div className="comparison-legend"><span className="legend-existing">Existing</span><span className="legend-proposed">Proposed</span></div>
    </div>
    <div className="comparison-canvas-wrap">
      <svg className="comparison-canvas" viewBox={boundsViewBox(bounds)} role="img" aria-label="Existing and proposed design comparison">
        <defs><clipPath id="proposedClip"><rect x={bounds.minX} y={bounds.minY} width={clipWidth} height={height} /></clipPath></defs>
        <DesignLayer design={existing} className="existing-layer" />
        <g clipPath="url(#proposedClip)"><DesignLayer design={proposed} className="proposed-layer" /></g>
        <line className="comparison-divider" x1={splitX} y1={bounds.minY} x2={splitX} y2={bounds.maxY} />
      </svg>
    </div>
    <label className="comparison-slider-label">
      <span>Proposed reveal</span>
      <input type="range" min="0" max="100" value={split} onChange={(event) => setSplit(Number(event.target.value))} aria-label="Reveal proposed design" />
      <strong>{split}%</strong>
    </label>
  </section>;
}
