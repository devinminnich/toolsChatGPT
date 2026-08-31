export type Point = { x: number; y: number };

export type FixtureInstance = {
  id: string;
  lineageId: string;
  definitionId?: string;
  name: string;
  category: string;
  widthMm: number;
  depthMm: number;
  xMm: number;
  yMm: number;
  rotationDeg: number;
};

export type ObjectDefinition = {
  id: string;
  name: string;
  category: string;
  widthMm: number;
  depthMm: number;
  createdAt: string;
  updatedAt: string;
};

export type Design = {
  id: string;
  name: string;
  kind: 'existing' | 'proposed';
  baselineDesignId?: string;
  /** Legacy mirror of the project room boundary. Kept for persisted V1 compatibility. */
  vertices: Point[];
  fixtures: FixtureInstance[];
  createdAt: string;
  updatedAt: string;
};

export type ScopeDecisionStatus = 'suggested' | 'accepted' | 'edited' | 'ignored';
export type ScopeEdit = { title?: string; description?: string; category?: string };

export type StoredProjectDocumentRef = {
  bucket: 'project-documents';
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

export type SavedContractorQuoteScopeItem = {
  title: string;
  description?: string;
  status: 'included' | 'excluded' | 'allowance' | 'optional';
};

export type SavedContractorQuote = {
  id: string;
  contractorName: string;
  quoteDate?: string;
  expirationDate?: string;
  total?: number;
  labor?: number;
  materials?: number;
  allowances?: number;
  schedule?: string;
  paymentTerms?: string;
  scope: SavedContractorQuoteScopeItem[];
  exclusions: string[];
  notes: string[];
  sourceText?: string;
  sourceDocument?: StoredProjectDocumentRef;
  importedAt: string;
};

export type ProjectReviewData = {
  scopeStatuses: Record<string, ScopeDecisionStatus>;
  scopeEdits?: Record<string, ScopeEdit>;
  contractorQuotes: SavedContractorQuote[];
};

export type ProjectActivityType =
  | 'project-created'
  | 'project-renamed'
  | 'room-updated'
  | 'proposal-created'
  | 'scope-updated'
  | 'quote-saved'
  | 'design-exported'
  | 'estimate-exported'
  | 'rfq-exported';

export type ProjectActivity = {
  id: string;
  type: ProjectActivityType;
  title: string;
  detail?: string;
  createdAt: string;
};

export type Project = {
  id: string;
  homeId: string;
  name: string;
  /** Canonical room boundary shared by Existing and every Proposed design. */
  roomVertices?: Point[];
  designs: Design[];
  activeDesignId: string;
  review?: ProjectReviewData;
  activity?: ProjectActivity[];
  createdAt: string;
  updatedAt: string;
};

export type Home = {
  id: string;
  name: string;
  projects: Project[];
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceData = {
  schemaVersion: 1;
  homes: Home[];
  activeHomeId: string;
  activeProjectId: string;
  objectDefinitions: ObjectDefinition[];
  updatedAt: string;
};

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function cloneAsProposed(source: Design, name: string): Design {
  const now = nowIso();
  return {
    id: createId('design'),
    name,
    kind: 'proposed',
    baselineDesignId: source.kind === 'existing' ? source.id : source.baselineDesignId ?? source.id,
    vertices: source.vertices.map((point) => ({ ...point })),
    fixtures: source.fixtures.map((fixture) => ({
      ...fixture,
      id: createId('fixture'),
      lineageId: fixture.lineageId || fixture.id,
    })),
    createdAt: now,
    updatedAt: now,
  };
}
