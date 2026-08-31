import { describe, expect, it } from 'vitest';
import { selectNewestWorkspace } from './workspaceSync';
import type { WorkspaceData } from './project';

function workspace(updatedAt: string): WorkspaceData {
  return { schemaVersion: 1, homes: [], activeHomeId: '', activeProjectId: '', objectDefinitions: [], updatedAt };
}

describe('selectNewestWorkspace', () => {
  it('selects the newest valid workspace', () => {
    const older = workspace('2026-08-31T00:00:00Z');
    const newer = workspace('2026-08-31T01:00:00Z');
    expect(selectNewestWorkspace(older, newer)).toBe(newer);
    expect(selectNewestWorkspace(newer, older)).toBe(newer);
  });

  it('uses whichever side exists', () => {
    const value = workspace('2026-08-31T00:00:00Z');
    expect(selectNewestWorkspace(value, null)).toBe(value);
    expect(selectNewestWorkspace(null, value)).toBe(value);
  });
});
