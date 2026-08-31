import type { ScopeSuggestion } from './scopeInference';

export type QualityTier = 'budget' | 'standard' | 'premium';
export type EstimateMode = 'diy' | 'contractor';
export type EstimateItemKind = 'scope' | 'tools-equipment' | 'disposal' | 'permit';

export type CostRange = {
  low: number;
  typical: number;
  high: number;
};

export type EstimateRegionProfile = {
  id: string;
  label: string;
  factor: number;
  source: 'curated-assumption' | 'user-override';
  note?: string;
};

export const NATIONAL_BASELINE_REGION: EstimateRegionProfile = {
  id: 'national-baseline',
  label: 'National baseline',
  factor: 1,
  source: 'curated-assumption',
  note: 'Neutral baseline until a project-specific regional profile is selected.',
};

export type EstimateItem = {
  id: string;
  scopeId: string;
  kind: EstimateItemKind;
  category: string;
  title: string;
  mode: EstimateMode;
  tier: QualityTier;
  cost: CostRange;
  provenance: 'regional-assumption';
  region: EstimateRegionProfile;
  notes: string[];
};

export type EstimateSummary = {
  mode: EstimateMode;
  tier: QualityTier;
  region: EstimateRegionProfile;
  items: EstimateItem[];
  subtotal: CostRange;
  contingency: CostRange;
  total: CostRange;
};

type Assumption = {
  diy: CostRange;
  contractor: CostRange;
};

const DEFAULT: Assumption = {
  diy: { low: 75, typical: 175, high: 350 },
  contractor: { low: 300, typical: 650, high: 1200 },
};

const ASSUMPTIONS: Record<string, Assumption> = {
  Plumbing: {
    diy: { low: 75, typical: 250, high: 650 },
    contractor: { low: 450, typical: 1000, high: 2200 },
  },
  Demolition: {
    diy: { low: 25, typical: 125, high: 350 },
    contractor: { low: 250, typical: 650, high: 1500 },
  },
  Installation: {
    diy: { low: 50, typical: 175, high: 450 },
    contractor: { low: 250, typical: 650, high: 1400 },
  },
  Construction: {
    diy: { low: 100, typical: 400, high: 1000 },
    contractor: { low: 600, typical: 1600, high: 4000 },
  },
  'General construction': {
    diy: { low: 250, typical: 900, high: 2500 },
    contractor: { low: 1500, typical: 4000, high: 10000 },
  },
};

const TIER_MULTIPLIER: Record<QualityTier, number> = {
  budget: 0.8,
  standard: 1,
  premium: 1.45,
};

const TOOLS_EQUIPMENT: CostRange = { low: 75, typical: 250, high: 700 };
const DISPOSAL: Record<EstimateMode, CostRange> = {
  diy: { low: 50, typical: 200, high: 600 },
  contractor: { low: 150, typical: 450, high: 1200 },
};
const PERMIT: Record<EstimateMode, CostRange> = {
  diy: { low: 0, typical: 250, high: 900 },
  contractor: { low: 0, typical: 400, high: 1500 },
};

function scale(range: CostRange, factor: number): CostRange {
  return {
    low: Math.round(range.low * factor),
    typical: Math.round(range.typical * factor),
    high: Math.round(range.high * factor),
  };
}

function add(a: CostRange, b: CostRange): CostRange {
  return { low: a.low + b.low, typical: a.typical + b.typical, high: a.high + b.high };
}

function overheadItem(
  kind: Exclude<EstimateItemKind, 'scope'>,
  title: string,
  category: string,
  baseCost: CostRange,
  mode: EstimateMode,
  tier: QualityTier,
  region: EstimateRegionProfile,
  note: string,
): EstimateItem {
  return {
    id: `estimate:${mode}:${kind}`,
    scopeId: `overhead:${kind}`,
    kind,
    category,
    title,
    mode,
    tier,
    cost: scale(baseCost, region.factor),
    provenance: 'regional-assumption',
    region,
    notes: [`${region.label} cost profile (${region.factor.toFixed(2)}× baseline).`, note],
  };
}

export function estimateScope(
  scope: ScopeSuggestion[],
  mode: EstimateMode,
  tier: QualityTier = 'standard',
  region: EstimateRegionProfile = NATIONAL_BASELINE_REGION,
): EstimateSummary {
  const included = scope.filter((item) => item.status !== 'ignored');
  const factor = TIER_MULTIPLIER[tier] * region.factor;

  const items = included.map<EstimateItem>((item) => {
    const assumption = ASSUMPTIONS[item.category] ?? DEFAULT;
    return {
      id: `estimate:${mode}:${item.id}`,
      scopeId: item.id,
      kind: 'scope',
      category: item.category,
      title: item.title,
      mode,
      tier,
      cost: scale(assumption[mode], factor),
      provenance: 'regional-assumption',
      region,
      notes: [
        `${region.label} cost profile (${region.factor.toFixed(2)}× baseline).`,
        region.note ?? 'Regional factor can be replaced with a project-specific assumption.',
        mode === 'diy'
          ? 'Includes a basic allowance for materials and consumables associated with this scope item; material takeoffs carry their own waste assumptions where applicable.'
          : 'Represents a broad installed-cost allowance; local labor, access, hidden conditions, and actual bids may materially change pricing.',
      ],
    };
  });

  const categories = new Set(included.map((item) => item.category.toLowerCase()));
  const hasMessyWork = [...categories].some((category) => category.includes('demolition') || category.includes('construction'));
  const hasPermitWork = [...categories].some((category) => category.includes('plumbing') || category.includes('construction') || category.includes('electrical'));

  if (mode === 'diy' && included.length) {
    items.push(overheadItem(
      'tools-equipment',
      'Tools and equipment allowance',
      'Tools / equipment',
      TOOLS_EQUIPMENT,
      mode,
      tier,
      region,
      'Allowance for project-specific hand tools, specialty tools, protective equipment, or short-term equipment rental not already owned.',
    ));
  }

  if (hasMessyWork) {
    items.push(overheadItem(
      'disposal',
      'Waste and disposal allowance',
      'Waste / disposal',
      DISPOSAL[mode],
      mode,
      tier,
      region,
      'Allowance for debris handling, bags or hauling, dump/transfer fees, or contractor disposal. Actual volume and local fees can vary materially.',
    ));
  }

  if (hasPermitWork) {
    items.push(overheadItem(
      'permit',
      'Permit allowance',
      'Permits',
      PERMIT[mode],
      mode,
      tier,
      region,
      'Placeholder only. Permit requirements and fees must be confirmed for the actual project jurisdiction and scope.',
    ));
  }

  const subtotal = items.reduce<CostRange>((sum, item) => add(sum, item.cost), { low: 0, typical: 0, high: 0 });
  const contingencyRate = mode === 'diy' ? 0.12 : 0.15;
  const contingency = scale(subtotal, contingencyRate);
  const total = add(subtotal, contingency);

  return { mode, tier, region, items, subtotal, contingency, total };
}
