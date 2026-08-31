import type { ScopeSuggestion } from './scopeInference';

export type QualityTier = 'budget' | 'standard' | 'premium';
export type EstimateMode = 'diy' | 'contractor';

export type CostRange = {
  low: number;
  typical: number;
  high: number;
};

export type EstimateItem = {
  id: string;
  scopeId: string;
  category: string;
  title: string;
  mode: EstimateMode;
  tier: QualityTier;
  cost: CostRange;
  provenance: 'regional-assumption';
  notes: string[];
};

export type EstimateSummary = {
  mode: EstimateMode;
  tier: QualityTier;
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

export function estimateScope(
  scope: ScopeSuggestion[],
  mode: EstimateMode,
  tier: QualityTier = 'standard',
): EstimateSummary {
  const included = scope.filter((item) => item.status !== 'ignored');
  const factor = TIER_MULTIPLIER[tier];

  const items = included.map<EstimateItem>((item) => {
    const assumption = ASSUMPTIONS[item.category] ?? DEFAULT;
    return {
      id: `estimate:${mode}:${item.id}`,
      scopeId: item.id,
      category: item.category,
      title: item.title,
      mode,
      tier,
      cost: scale(assumption[mode], factor),
      provenance: 'regional-assumption',
      notes: [
        'Preliminary regional assumption, not a contractor quote.',
        mode === 'diy'
          ? 'Includes a basic allowance for materials/consumables associated with this scope item.'
          : 'Represents a broad installed-cost allowance; local labor, access, permits, and hidden conditions may materially change pricing.',
      ],
    };
  });

  const subtotal = items.reduce<CostRange>((sum, item) => add(sum, item.cost), { low: 0, typical: 0, high: 0 });
  const contingencyRate = mode === 'diy' ? 0.12 : 0.15;
  const contingency = scale(subtotal, contingencyRate);
  const total = add(subtotal, contingency);

  return { mode, tier, items, subtotal, contingency, total };
}
