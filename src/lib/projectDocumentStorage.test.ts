import { describe, expect, it } from 'vitest';
import { buildProjectDocumentPath, sanitizeDocumentFilename } from './projectDocumentStorage';

describe('project document storage helpers', () => {
  it('sanitizes filenames without losing useful extension information', () => {
    expect(sanitizeDocumentFilename('ABC Contractor Quote (final).pdf')).toBe('ABC-Contractor-Quote-final-.pdf');
    expect(sanitizeDocumentFilename('  weird / name?.jpg  ')).toBe('weird-name-.jpg');
  });

  it('builds an owner-scoped project path required by storage RLS', () => {
    const path = buildProjectDocumentPath('user-123', 'project-456', 'quote final.pdf', 'doc-789');
    expect(path).toBe('user-123/project-456/doc-789-quote-final.pdf');
  });
});
