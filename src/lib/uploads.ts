// Attachment uploads. In live mode attachments go to Supabase Storage (so the
// shared-state row never carries base64 blobs); without Supabase we fall back
// to inline data URLs so the demo keeps working offline.
//
// Live mode requires a public bucket named `attachments` (see RUNBOOK.md).
import { getSupabase, isSupabaseConfigured } from './supabase';
import { v4 as uuid } from 'uuid';

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export interface ResolvedAttachment {
  url: string;
  name: string;
  type: string;
}

function toDataUrl(file: File): Promise<ResolvedAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result as string, name: file.name, type: file.type });
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resolve a selected file to a storable URL. Returns null when the file is too
 * large or a storage upload fails (callers surface this to the user instead of
 * silently persisting a base64 blob).
 */
export async function resolveAttachment(file: File): Promise<ResolvedAttachment | null> {
  if (file.size > MAX_ATTACHMENT_BYTES) return null;
  if (!isSupabaseConfigured()) return toDataUrl(file);

  try {
    const safeExt = (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    const path = `${uuid()}.${safeExt || 'bin'}`;
    const { error } = await getSupabase()
      .storage.from('attachments')
      .upload(path, file, { contentType: file.type || 'application/octet-stream', cacheControl: '3600', upsert: false });
    if (error) return null;
    const { data } = getSupabase().storage.from('attachments').getPublicUrl(path);
    return { url: data.publicUrl, name: file.name, type: file.type || 'application/octet-stream' };
  } catch {
    return null;
  }
}
