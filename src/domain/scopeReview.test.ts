import { describe, expect, it } from 'vitest';
import { applyScopeReview } from './scopeReview';
import type { ScopeSuggestion } from './scopeInference';

const scope: ScopeSuggestion[] = [{
  id: 'scope-1',
  category: 'Plumbing',
  title: 'Relocate toilet',
  description: 'Relocate fixture and plumbing.',
  status: 'suggested',
}];

describe('applyScopeReview', () => {
  it('applies persisted status and custom wording', () => {
    const reviewed = applyScopeReview(scope, {
      scopeStatuses: { 'scope-1': 'edited' },
      scopeEdits: { 'scope-1': { title: 'Move toilet to north wall', description: 'Include flange and supply relocation.' } },
      contractorQuotes: [],
    });
    expect(reviewed[0].status).toBe('edited');
    expect(reviewed[0].title).toBe('Move toilet to north wall');
    expect(reviewed[0].description).toBe('Include flange and supply relocation.');
  });

  it('leaves inferred scope unchanged without saved review data', () => {
    expect(applyScopeReview(scope)).toEqual(scope);
  });
});
