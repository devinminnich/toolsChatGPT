import { useEffect, useMemo, useState } from 'react';
import QuoteReview from './QuoteReview';
import { diffDesigns } from './domain/designDiff';
import { estimateScope, type EstimateMode, type QualityTier } from './domain/estimating';
import { calculateMaterials } from './domain/materials';
import { buildEstimatePdfSections, buildRfqPdfSections } from './domain/pdfContent';
import { generateRfq } from './domain/rfq';
import { inferScope, type ScopeSuggestion } from './domain/scopeInference';
import type { WorkspaceData } from './domain/project';
import { WORKSPACE_SAVED_EVENT, workspacePersistence } from './lib/persistence';
import { downloadPdf } from './lib/pdfExport';
import { formatMeasurement } from './lib/units';

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function changeLabel(item: ReturnType<typeof diffDesigns>['fixtureChanges'][number]) {
  const fixture = item.after ?? item.before;
  const name = fixture?.name ?? 'Object';
  if (item.type === 'moved') return `${name} moved ${formatMeasurement(item.moveDistanceMm ?? 0, 'ft-in')}`;
  if (item.type === 'added') return `${name} added`;
  if (item.type === 'removed') return `${name} removed`;
  if (item.type === 'resized') return `${name} resized`;
  return `${name} rotated`;
}

export default function ReviewPanel() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<QualityTier>('standard');
  const [mode, setMode] = useState<EstimateMode>('contractor');
  const [scopeOverrides, setScopeOverrides] = useState<Record<string, ScopeSuggestion['status']>>({});

  useEffect(() => {
    workspacePersistence.load().then(setWorkspace);
    const onSaved = (event: Event) => setWorkspace((event as CustomEvent<WorkspaceData>).detail);
    window.addEventListener(WORKSPACE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(WORKSPACE_SAVED_EVENT, onSaved);
  }, []);

  const review = useMemo(() => {
    if (!workspace) return null;
    const home = workspace.homes.find((item) => item.id === workspace.activeHomeId) ?? workspace.homes[0];
    const project = home?.projects.find((item) => item.id === workspace.activeProjectId) ?? home?.projects[0];
    if (!project) return null;
    const existing = project.designs.find((design) => design.kind === 'existing');
    const proposed = project.designs.find((design) => design.id === project.activeDesignId && design.kind === 'proposed')
      ?? project.designs.find((design) => design.kind === 'proposed');
    if (!existing || !proposed) return { project, existing, proposed: null, diff: null, scope: [] as ScopeSuggestion[] };
    const diff = diffDesigns(existing, proposed);
    const scope = inferScope(diff).map((item) => ({ ...item, status: scopeOverrides[item.id] ?? item.status }));
    return { project, existing, proposed, diff, scope };
  }, [workspace, scopeOverrides]);

  const estimate = useMemo(() => review?.scope ? estimateScope(review.scope, mode, tier) : null, [review?.scope, mode, tier]);
  const materials = useMemo(() => review?.proposed ? calculateMaterials(review.proposed) : [], [review?.proposed]);
  const rfq = useMemo(() => {
    if (!review?.project || !review.existing || !review.proposed) return null;
    return generateRfq(review.project, review.existing, review.proposed, review.scope, materials, estimate ?? undefined);
  }, [review?.project, review?.existing, review?.proposed, review?.scope, materials, estimate]);
  const changeCount = (review?.diff?.fixtureChanges.length ?? 0) + (review?.diff?.geometryChanged ? 1 : 0);

  return (
    <section className={`review-drawer ${open ? 'open' : ''}`}>
      <button className="review-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        <span>Review project</span>
        <strong>{review?.proposed ? `${changeCount} change${changeCount === 1 ? '' : 's'}` : 'Create a proposed option'}</strong>
      </button>

      {open && <div className="review-content">
        {!review?.proposed ? (
          <div className="review-empty">
            <h2>Existing vs Proposed</h2>
            <p>Create a Proposed option from the editor, make changes, then return here to review detected changes, suggested scope, materials, preliminary costs, and the contractor RFQ.</p>
          </div>
        ) : (
          <>
            <div className="review-heading">
              <div><p className="eyebrow">Comparison</p><h2>{review.existing.name} → {review.proposed.name}</h2></div>
              <span className="review-count">{changeCount} detected</span>
            </div>

            <div className="review-grid">
              <section className="review-card">
                <h3>Design changes</h3>
                {changeCount === 0 ? <p className="muted">No changes detected yet.</p> : <ul className="change-list">
                  {review.diff?.fixtureChanges.map((item, index) => <li key={`${item.type}-${item.lineageId}-${index}`}>{changeLabel(item)}</li>)}
                  {review.diff?.geometryChanged && <li>Room/area geometry changed</li>}
                </ul>}
              </section>

              <section className="review-card scope-card">
                <h3>Suggested scope</h3>
                {review.scope.length === 0 ? <p className="muted">Make a design change to generate scope.</p> : review.scope.map((item) => (
                  <div className={`scope-row status-${item.status}`} key={item.id}>
                    <div><span className="scope-category">{item.category}</span><strong>{item.title}</strong><p>{item.description}</p></div>
                    <select value={item.status} onChange={(event) => setScopeOverrides((current) => ({ ...current, [item.id]: event.target.value as ScopeSuggestion['status'] }))}>
                      <option value="suggested">Suggested</option><option value="accepted">Accept</option><option value="ignored">Ignore</option>
                    </select>
                  </div>
                ))}
              </section>

              <section className="review-card materials-card">
                <h3>Material takeoff</h3>
                {materials.length === 0 ? <p className="muted">Add supported fixtures such as a shower, toilet, vanity, or sink to generate material planning quantities.</p> : <div className="material-lines">
                  {materials.map((item) => <div className="material-row" key={item.id}>
                    <div><strong>{item.name}</strong><span>{item.basis}</span>{item.assumption && <small>{item.assumption}</small>}</div>
                    <b>{item.quantity} {item.unit}</b>
                  </div>)}
                </div>}
              </section>

              <section className="review-card estimate-card">
                <div className="estimate-controls">
                  <div><h3>Preliminary estimate</h3><p className="muted">Regional assumptions; not a contractor quote.</p></div>
                  <div className="estimate-selects">
                    <select value={mode} onChange={(event) => setMode(event.target.value as EstimateMode)}><option value="contractor">Contractor</option><option value="diy">DIY</option></select>
                    <select value={tier} onChange={(event) => setTier(event.target.value as QualityTier)}><option value="budget">Budget</option><option value="standard">Standard</option><option value="premium">Premium</option></select>
                  </div>
                </div>
                {estimate && <>
                  <div className="estimate-range">
                    <div><span>Low</span><strong>{currency(estimate.total.low)}</strong></div><div><span>Typical</span><strong>{currency(estimate.total.typical)}</strong></div><div><span>High</span><strong>{currency(estimate.total.high)}</strong></div>
                  </div>
                  <button className="export-button" type="button" onClick={() => downloadPdf(`${review.project.name} ${mode} estimate`, buildEstimatePdfSections(review.project.name, estimate))}>Download estimate PDF</button>
                  <details><summary>Estimate breakdown ({estimate.items.length} items)</summary><div className="estimate-lines">{estimate.items.map((item) => <div key={item.id}><span>{item.title}</span><strong>{currency(item.cost.typical)}</strong></div>)}<div><span>Contingency</span><strong>{currency(estimate.contingency.typical)}</strong></div></div></details>
                </>}
              </section>

              {rfq && <>
                <section className="review-card rfq-card">
                  <div className="rfq-heading"><div><h3>Contractor RFQ preview</h3><p className="muted">Built from the current proposed design and non-ignored scope.</p></div><span>{rfq.scope.length} scope items</span></div>
                  <p>{rfq.overview}</p>
                  <button className="export-button" type="button" onClick={() => downloadPdf(`${rfq.projectName} RFQ`, buildRfqPdfSections(rfq))}>Download RFQ PDF</button>
                  <details><summary>Requested pricing breakdown</summary><ul>{rfq.pricingRequest.map((line) => <li key={line}>{line}</li>)}</ul></details>
                  <details><summary>Contractor questions</summary><ul>{rfq.contractorQuestions.map((line) => <li key={line}>{line}</li>)}</ul></details>
                </section>
                <QuoteReview rfq={rfq} />
              </>}
            </div>
          </>
        )}
      </div>}
    </section>
  );
}
