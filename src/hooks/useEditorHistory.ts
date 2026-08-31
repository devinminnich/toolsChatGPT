import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  commitEditorSnapshot,
  createEditorHistory,
  redoEditorHistory,
  resetEditorHistory,
  undoEditorHistory,
  type EditorHistory,
} from '../domain/editorHistory';
import type { FixtureInstance, Point } from '../domain/project';

type Options = {
  designId?: string;
  vertices: Point[];
  fixtures: FixtureInstance[];
  setVertices: Dispatch<SetStateAction<Point[]>>;
  setFixtures: Dispatch<SetStateAction<FixtureInstance[]>>;
};

export function useEditorHistory({ designId, vertices, fixtures, setVertices, setFixtures }: Options) {
  const [history, setHistory] = useState<EditorHistory>(() => createEditorHistory({ vertices, fixtures }));
  const timerRef = useRef<number | null>(null);
  const applyingRef = useRef(false);
  const designIdRef = useRef(designId);

  useEffect(() => {
    if (designIdRef.current === designId) return;
    designIdRef.current = designId;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setHistory(resetEditorHistory({ vertices, fixtures }));
  }, [designId]);

  useEffect(() => {
    if (applyingRef.current) {
      applyingRef.current = false;
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setHistory((current) => commitEditorSnapshot(current, { vertices, fixtures }));
    }, 260);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [vertices, fixtures]);

  function apply(next: EditorHistory) {
    applyingRef.current = true;
    setHistory(next);
    setVertices(next.present.vertices.map((point) => ({ ...point })));
    setFixtures(next.present.fixtures.map((fixture) => ({ ...fixture })));
  }

  function undo() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const next = undoEditorHistory(history);
    if (next === history) return;
    apply(next);
  }

  function redo() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const next = redoEditorHistory(history);
    if (next === history) return;
    apply(next);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history]);

  return {
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
