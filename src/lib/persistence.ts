import type { WorkspaceData } from '../domain/project';

const STORAGE_KEY = 'home-renovation-planner.workspace.v1';

export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface WorkspacePersistence {
  load(): Promise<WorkspaceData | null>;
  save(data: WorkspaceData): Promise<void>;
}

class LocalWorkspacePersistence implements WorkspacePersistence {
  async load(): Promise<WorkspaceData | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as WorkspaceData;
      if (parsed?.schemaVersion !== 1) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async save(data: WorkspaceData): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

export const workspacePersistence: WorkspacePersistence = new LocalWorkspacePersistence();

export function clearLocalWorkspace() {
  localStorage.removeItem(STORAGE_KEY);
}
