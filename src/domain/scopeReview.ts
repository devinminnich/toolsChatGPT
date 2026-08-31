import type { ProjectReviewData } from './project';
import type { ScopeSuggestion } from './scopeInference';

export function applyScopeReview(scope: ScopeSuggestion[], review?: ProjectReviewData): ScopeSuggestion[] {
  return scope.map((item) => ({
    ...item,
    ...(review?.scopeEdits?.[item.id] ?? {}),
    status: review?.scopeStatuses[item.id] ?? item.status,
  }));
}
