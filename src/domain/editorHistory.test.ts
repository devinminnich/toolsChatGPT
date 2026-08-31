import { describe, expect, it } from 'vitest';
import { commitEditorSnapshot, createEditorHistory, redoEditorHistory, undoEditorHistory } from './editorHistory';

const a = { vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], fixtures: [] };
const b = { vertices: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 100, y: 100 }], fixtures: [] };
const c = { vertices: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 100, y: 100 }], fixtures: [] };

describe('editor history', () => {
  it('undoes and redoes committed snapshots', () => {
    let history = createEditorHistory(a);
    history = commitEditorSnapshot(history, b);
    history = commitEditorSnapshot(history, c);

    history = undoEditorHistory(history);
    expect(history.present.vertices[1].x).toBe(200);
    expect(history.future).toHaveLength(1);

    history = redoEditorHistory(history);
    expect(history.present.vertices[1].x).toBe(300);
  });

  it('clears redo after a new branch of edits', () => {
    let history = createEditorHistory(a);
    history = commitEditorSnapshot(history, b);
    history = undoEditorHistory(history);
    history = commitEditorSnapshot(history, c);
    expect(history.future).toHaveLength(0);
  });

  it('caps retained history', () => {
    let history = createEditorHistory(a);
    history = commitEditorSnapshot(history, b, 1);
    history = commitEditorSnapshot(history, c, 1);
    expect(history.past).toHaveLength(1);
  });
});
