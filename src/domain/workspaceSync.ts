import type { WorkspaceData } from './project';

export function selectNewestWorkspace(local: WorkspaceData | null, cloud: WorkspaceData | null): WorkspaceData | null {
  if (!local) return cloud;
  if (!cloud) return local;
  const localTime = Date.parse(local.updatedAt);
  const cloudTime = Date.parse(cloud.updatedAt);
  if (!Number.isFinite(localTime)) return cloud;
  if (!Number.isFinite(cloudTime)) return local;
  return localTime >= cloudTime ? local : cloud;
}
