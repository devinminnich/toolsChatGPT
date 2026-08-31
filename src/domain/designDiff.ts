import type { Design, FixtureInstance } from './project';

export type FixtureChangeType = 'added' | 'removed' | 'moved' | 'resized' | 'rotated';

export type FixtureChange = {
  type: FixtureChangeType;
  lineageId: string;
  before?: FixtureInstance;
  after?: FixtureInstance;
  moveDistanceMm?: number;
};

export type DesignDiff = {
  fixtureChanges: FixtureChange[];
  geometryChanged: boolean;
};

function sameVertices(a: Design['vertices'], b: Design['vertices']) {
  return a.length === b.length && a.every((point, index) => point.x === b[index].x && point.y === b[index].y);
}

export function diffDesigns(before: Design, after: Design): DesignDiff {
  const beforeByLineage = new Map(before.fixtures.map((fixture) => [fixture.lineageId, fixture]));
  const afterByLineage = new Map(after.fixtures.map((fixture) => [fixture.lineageId, fixture]));
  const lineages = new Set([...beforeByLineage.keys(), ...afterByLineage.keys()]);
  const fixtureChanges: FixtureChange[] = [];

  for (const lineageId of lineages) {
    const prior = beforeByLineage.get(lineageId);
    const next = afterByLineage.get(lineageId);

    if (!prior && next) {
      fixtureChanges.push({ type: 'added', lineageId, after: next });
      continue;
    }
    if (prior && !next) {
      fixtureChanges.push({ type: 'removed', lineageId, before: prior });
      continue;
    }
    if (!prior || !next) continue;

    const moveDistanceMm = Math.hypot(next.xMm - prior.xMm, next.yMm - prior.yMm);
    if (moveDistanceMm > 0) {
      fixtureChanges.push({ type: 'moved', lineageId, before: prior, after: next, moveDistanceMm });
    }
    if (next.widthMm !== prior.widthMm || next.depthMm !== prior.depthMm) {
      fixtureChanges.push({ type: 'resized', lineageId, before: prior, after: next });
    }
    if (next.rotationDeg !== prior.rotationDeg) {
      fixtureChanges.push({ type: 'rotated', lineageId, before: prior, after: next });
    }
  }

  return {
    fixtureChanges,
    geometryChanged: !sameVertices(before.vertices, after.vertices),
  };
}
