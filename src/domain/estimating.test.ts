import { describe, expect, it } from 'vitest';
import { estimateScope } from './estimating';
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
  it('excludes ignored scope and adds contingency', () => {
    const result = estimateScope(scope, 'contractor', 'standard');
    expect(result.items).toHaveLength(2);
    expect(result.subtotal.typical).toBe(1650);
    expect(result.contingency.typical).toBe(248);
    expect(result.total.typical).toBe(1898);
  });

  it('scales premium estimates above standard', () => {
    const standard = estimateScope(scope, 'diy', 'standard');
    const premium = estimateScope(scope, 'diy', 'premium');
    expect(premium.total.typical).toBeGreaterThan(standard.total.typical);
  });
});
