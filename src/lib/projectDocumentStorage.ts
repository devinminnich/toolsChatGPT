import type { StoredProjectDocumentRef } from '../domain/project';
import { supabase } from './supabase';

export const PROJECT_DOCUMENT_BUCKET = 'project-documents' as const;

export function sanitizeDocumentFilename(name: string) {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'document';
}

export function buildProjectDocumentPath(userId: string, projectId: string, filename: string, id = crypto.randomUUID()) {
  return `${userId}/${projectId}/${id}-${sanitizeDocumentFilename(filename)}`;
}

export async function uploadProjectDocument(projectId: string, file: File): Promise<StoredProjectDocumentRef | null> {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return null;

  const path = buildProjectDocumentPath(user.id, projectId, file.name);
  const { error } = await supabase.storage.from(PROJECT_DOCUMENT_BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;

  return {
    bucket: PROJECT_DOCUMENT_BUCKET,
    path,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

export async function createProjectDocumentSignedUrl(path: string, expiresInSeconds = 300) {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(PROJECT_DOCUMENT_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
