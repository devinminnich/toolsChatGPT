import { useEffect, useRef, useState } from 'react';
import type { WorkspaceData } from './domain/project';
import { WORKSPACE_SAVED_EVENT, workspacePersistence } from './lib/persistence';

type History = {
  past: WorkspaceData[];
  present: WorkspaceData | null;
  future: WorkspaceData[];
};

function sameWorkspace(a: WorkspaceData | null, b: WorkspaceData) {
  if (!a) return false;
  const normalize = (value: WorkspaceData) => JSON.stringify({ ...value, updatedAt: '' });
  return normalize(a) === normalize(b);
}

export default function UndoRedoBar() {
  const [history, setHistory] = useState<History>({ past: [], present: null, future: [] });
  const applyingRef = useRef(false);

  useEffect(() => {
    workspacePersistence.load().then((workspace) => {
      if (workspace) setHistory({ past: [], present: workspace, future: [] });
    });

    const onSaved = (event: Event) => {
      const workspace = (event as CustomEvent<WorkspaceData>).detail;
      setHistory((current) => {
        if (applyingRef.current) {
          applyingRef.current = false;
          return { ...current, present: workspace };
        }
        if (sameWorkspace(current.present, workspace)) return current;
        return {
          past: current.present ? [...current.past, current.present].slice(-50) : current.past,
          present: workspace,
          future: [],
        };
      });
    };

    window.addEventListener(WORKSPACE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(WORKSPACE_SAVED_EVENT, onSaved);
  }, []);

  async function undo() {
    const previous = history.past[history.past.length - 1];
    if (!previous || !history.present) return;
    const next: History = {
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future],
    };
    applyingRef.current = true;
    setHistory(next);
    await workspacePersistence.save(previous);
  }

  async function redo() {
    const upcoming = history.future[0];
    if (!upcoming || !history.present) return;
    const next: History = {
      past: [...history.past, history.present].slice(-50),
      present: upcoming,
      future: history.future.slice(1),
    };
    applyingRef.current = true;
    setHistory(next);
    await workspacePersistence.save(upcoming);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      void (event.shiftKey ? redo() : undo());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history]);

  return (
    <div className="undo-redo-bar" aria-label="Editing history">
      <button type="button" disabled={!history.past.length} onClick={() => void undo()} aria-label="Undo last saved edit">↶ Undo</button>
      <button type="button" disabled={!history.future.length} onClick={() => void redo()} aria-label="Redo edit">↷ Redo</button>
    </div>
  );
}
