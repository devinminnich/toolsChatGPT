import { describe, expect, it } from 'vitest';
import { estimateScope, type EstimateRegionProfile } from './estimating';
import type { ScopeSuggestion } from './scopeInference';

const scope: ScopeSuggestion[] = [
  {
    id: 'move-toilet',
    category: 'Plumbing',
    title: 'Relocate Toilet',
    description: 'Move toilet',
    status: 'accepted',
  },
  {
    id: 'remove-vanity',
    category: 'Demolition',
    title: 'Remove Vanity',
    description: 'Remove vanity',
    status: 'suggested',
  },
  {
    id: 'ignored',
    category: 'Installation',
    title: 'Ignore me',
    description: 'Ignored item',
    status: 'ignored',
  },
];

describe('estimateScope', () => {
  it('excludes ignored scope and adds explicit contractor overhead plus contingency', () => {
    const result = estimateScope(scope, 'contractor', 'standard');
    expect(result.items).toHaveLength(4);
    expect(result.items.filter((item) => item.kind === 'scope')).toHaveLength(2);
    expect(result.items.some((item) => item.kind === 'disposal')).toBe(true);
    expect(result.items.some((item) => item.kind === 'permit')).toBe(true);
    expect(result.items.some((item) => item.scopeId === 'ignored')).toBe(false);
    expect(result.subtotal.typical).toBe(2500);
    expect(result.contingency.typical).toBe(375);
    expect(result.total.typical).toBe(2875);
    expect(result.region.label).toBe('National baseline');
  });

  it('scales premium estimates above standard', () => {
    const standard = estimateScope(scope, 'diy', 'standard');
    const premium = estimateScope(scope, 'diy', 'premium');
    expect(premium.total.typical).toBeGreaterThan(standard.total.typical);
  });

  it('applies an explicit regional adjustment and preserves provenance', () => {
    const region: EstimateRegionProfile = {
      id: 'test-region',
      label: 'Test Region',
      factor: 1.2,
      source: 'user-override',
    };
    const baseline = estimateScope(scope, 'contractor', 'standard');
    const adjusted = estimateScope(scope, 'contractor', 'standard', region);
    expect(adjusted.subtotal.typical).toBe(Math.round(baseline.subtotal.typical * 1.2));
    expect(adjusted.region).toEqual(region);
    expect(adjusted.items[0].notes[0]).toContain('Test Region');
  });
});
