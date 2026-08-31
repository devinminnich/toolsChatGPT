import type { WorkspaceData } from '../domain/project';
import { selectNewestWorkspace } from '../domain/workspaceSync';
import { supabase } from './supabase';

const STORAGE_KEY = 'home-renovation-planner.workspace.v1';
export const WORKSPACE_SAVED_EVENT = 'home-renovation-planner:workspace-saved';

export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export interface WorkspacePersistence {
  load(): Promise<WorkspaceData | null>;
  save(data: WorkspaceData): Promise<void>;
  sync(): Promise<WorkspaceData | null>;
}

function parseWorkspace(raw: string | null): WorkspaceData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkspaceData;
    return parsed?.schemaVersion === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function publishWorkspace(data: WorkspaceData) {
  window.dispatchEvent(new CustomEvent<WorkspaceData>(WORKSPACE_SAVED_EVENT, { detail: data }));
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

class LocalFirstWorkspacePersistence implements WorkspacePersistence {
  async load(): Promise<WorkspaceData | null> {
    const local = parseWorkspace(localStorage.getItem(STORAGE_KEY));
    if (!supabase || isOffline()) return local;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return local;

      const { data, error } = await supabase
        .from('workspace_documents')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return local;
      const cloud = data?.data as WorkspaceData | undefined;
      const selected = selectNewestWorkspace(local, cloud?.schemaVersion === 1 ? cloud : null);
      if (selected) localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      return selected;
    } catch {
      return local;
    }
  }

  async save(data: WorkspaceData): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    publishWorkspace(data);
    if (!supabase || isOffline()) return;

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return;

    const { error } = await supabase.from('workspace_documents').upsert({
      user_id: user.id,
      data,
      updated_at: data.updatedAt,
    });
    if (error) throw error;
  }

  async sync(): Promise<WorkspaceData | null> {
    const local = parseWorkspace(localStorage.getItem(STORAGE_KEY));
    if (!supabase || isOffline()) return local;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return local;

      const { data, error } = await supabase
        .from('workspace_documents')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;

      const cloud = data?.data as WorkspaceData | undefined;
      const selected = selectNewestWorkspace(local, cloud?.schemaVersion === 1 ? cloud : null);
      if (!selected) return null;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      publishWorkspace(selected);

      const cloudUpdatedAt = cloud?.schemaVersion === 1 ? cloud.updatedAt : null;
      if (selected.updatedAt !== cloudUpdatedAt) {
        const { error: saveError } = await supabase.from('workspace_documents').upsert({
          user_id: user.id,
          data: selected,
          updated_at: selected.updatedAt,
        });
        if (saveError) throw saveError;
      }

      return selected;
    } catch {
      return local;
    }
  }
}

export const workspacePersistence: WorkspacePersistence = new LocalFirstWorkspacePersistence();

export function clearLocalWorkspace() {
  localStorage.removeItem(STORAGE_KEY);
}
