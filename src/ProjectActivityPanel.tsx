import { useEffect, useMemo, useState } from 'react';
import type { WorkspaceData } from './domain/project';
import { WORKSPACE_SAVED_EVENT, workspacePersistence } from './lib/persistence';

function formatWhen(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ProjectActivityPanel() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    workspacePersistence.load().then(setWorkspace);
    const onSaved = (event: Event) => setWorkspace((event as CustomEvent<WorkspaceData>).detail);
    window.addEventListener(WORKSPACE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(WORKSPACE_SAVED_EVENT, onSaved);
  }, []);

  const project = useMemo(() => {
    const home = workspace?.homes.find((item) => item.id === workspace.activeHomeId) ?? workspace?.homes[0];
    return home?.projects.find((item) => item.id === workspace?.activeProjectId) ?? home?.projects[0];
  }, [workspace]);

  if (!project) return null;
  const activities = project.activity ?? [];

  return (
    <section className={`activity-panel ${open ? 'open' : ''}`}>
      <button type="button" className="activity-toggle" onClick={() => setOpen((value) => !value)}>
        <span>Project history</span>
        <strong>{activities.length ? `${activities.length} checkpoint${activities.length === 1 ? '' : 's'}` : 'No checkpoints yet'}</strong>
      </button>
      {open && <div className="activity-list">
        {activities.length === 0 ? <p>No meaningful project checkpoints have been recorded yet.</p> : activities.map((item) => (
          <article key={item.id}>
            <div><strong>{item.title}</strong><time>{formatWhen(item.createdAt)}</time></div>
            {item.detail && <p>{item.detail}</p>}
          </article>
        ))}
      </div>}
    </section>
  );
}
