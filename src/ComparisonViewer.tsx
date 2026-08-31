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
  const [showProposal, setShowProposal] = useState(false);
  const bounds = useMemo(() => combinedDesignBounds(existing, proposed), [existing, proposed]);
  const activeDesign = showProposal ? proposed : existing;
  const activeClass = showProposal ? 'proposed-layer' : 'existing-layer';
  const activeLabel = showProposal ? 'Proposal' : 'Actual';

  return <section className="review-card comparison-viewer-card">
    <div className="comparison-viewer-heading">
      <div><h3>Visual comparison</h3><p className="muted">Switch between the actual layout and the proposal.</p></div>
      <span className={`comparison-state ${showProposal ? 'is-proposal' : 'is-actual'}`}>Showing {activeLabel}</span>
    </div>

    <div className="comparison-switch-row">
      <span className={!showProposal ? 'active' : ''}>Actual</span>
      <button
        type="button"
        className={`comparison-switch ${showProposal ? 'on' : ''}`}
        role="switch"
        aria-checked={showProposal}
        aria-label="Switch between Actual and Proposal"
        onClick={() => setShowProposal((value) => !value)}
      >
        <span className="comparison-switch-thumb" />
      </button>
      <span className={showProposal ? 'active' : ''}>Proposal</span>
    </div>

    <div className="comparison-canvas-wrap">
      <svg className="comparison-canvas" viewBox={boundsViewBox(bounds)} role="img" aria-label={`${activeLabel} design`}>
        <DesignLayer design={activeDesign} className={activeClass} />
      </svg>
    </div>
  </section>;
}
