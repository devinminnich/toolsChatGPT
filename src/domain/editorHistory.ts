import type { FixtureInstance, Point } from './project';

export type EditorSnapshot = {
  vertices: Point[];
  fixtures: FixtureInstance[];
};

export type EditorHistory = {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
};

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    vertices: snapshot.vertices.map((point) => ({ ...point })),
    fixtures: snapshot.fixtures.map((fixture) => ({ ...fixture })),
  };
}

function equalSnapshot(a: EditorSnapshot, b: EditorSnapshot) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createEditorHistory(initial: EditorSnapshot): EditorHistory {
  return { past: [], present: cloneSnapshot(initial), future: [] };
}

export function commitEditorSnapshot(history: EditorHistory, next: EditorSnapshot, limit = 50): EditorHistory {
  if (equalSnapshot(history.present, next)) return history;
  return {
    past: [...history.past, cloneSnapshot(history.present)].slice(-limit),
    present: cloneSnapshot(next),
    future: [],
  };
}

export function undoEditorHistory(history: EditorHistory): EditorHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: cloneSnapshot(previous),
    future: [cloneSnapshot(history.present), ...history.future],
  };
}

export function redoEditorHistory(history: EditorHistory): EditorHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, cloneSnapshot(history.present)],
    present: cloneSnapshot(next),
    future: history.future.slice(1),
  };
}

export function resetEditorHistory(snapshot: EditorSnapshot): EditorHistory {
  return createEditorHistory(snapshot);
}
