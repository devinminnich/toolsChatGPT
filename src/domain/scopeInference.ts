import type { DesignDiff, FixtureChange } from './designDiff';

export type ScopeSuggestion = {
  id: string;
  category: string;
  title: string;
  description: string;
  sourceLineageId?: string;
  status: 'suggested' | 'accepted' | 'edited' | 'ignored';
};

function suggestion(change: FixtureChange, category: string, title: string, description: string): ScopeSuggestion {
  return {
    id: `${change.type}:${change.lineageId}:${title}`,
    category,
    title,
    description,
    sourceLineageId: change.lineageId,
    status: 'suggested',
  };
}

function inferFixture(change: FixtureChange): ScopeSuggestion[] {
  const fixture = change.after ?? change.before;
  if (!fixture) return [];
  const name = fixture.name || fixture.category || 'fixture';
  const category = fixture.category.toLowerCase();

  if (change.type === 'added') {
    if (['toilet', 'sink', 'vanity', 'shower', 'tub', 'plumbing'].some((term) => category.includes(term))) {
      return [suggestion(change, 'Plumbing', `Install ${name}`, `Install ${name} at the proposed location and provide required supply, drain, vent, sealing, and finish connections as applicable.`)];
    }
    return [suggestion(change, 'Installation', `Install ${name}`, `Install ${name} at the proposed location, including required attachment and finish work.`)];
  }

  if (change.type === 'removed') {
    return [suggestion(change, 'Demolition', `Remove ${name}`, `Remove existing ${name} and repair affected adjacent finishes as required.`)];
  }

  if (change.type === 'moved') {
    if (['toilet', 'sink', 'vanity', 'shower', 'tub', 'plumbing'].some((term) => category.includes(term))) {
      return [suggestion(change, 'Plumbing', `Relocate ${name}`, `Remove and relocate ${name} to the proposed position, including plumbing modifications and repair of affected finishes.`)];
    }
    return [suggestion(change, 'Installation', `Relocate ${name}`, `Relocate ${name} to the proposed position and repair affected attachment or finish areas.`)];
  }

  if (change.type === 'resized') {
    return [suggestion(change, 'Construction', `Modify ${name} footprint`, `Modify construction and finish work to accommodate the proposed ${name} dimensions.`)];
  }

  if (change.type === 'rotated') {
    return [suggestion(change, 'Installation', `Reorient ${name}`, `Reorient ${name} to match the proposed layout and adjust connections or attachment points as required.`)];
  }

  return [];
}

export function inferScope(diff: DesignDiff): ScopeSuggestion[] {
  const suggestions = diff.fixtureChanges.flatMap(inferFixture);
  if (diff.geometryChanged) {
    suggestions.push({
      id: 'geometry:room-shape',
      category: 'General construction',
      title: 'Modify room/area geometry',
      description: 'Room or project-area geometry changed between Existing and Proposed. Review demolition, framing, substrate, finish, and trade impacts before accepting scope.',
      status: 'suggested',
    });
  }
  return suggestions;
}
