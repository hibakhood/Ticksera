-- 0012_storage_attachments.sql
-- Storage bucket for chat/file attachments. In live mode the app uploads files
-- here instead of embedding base64 blobs in the shared-state row (C3).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', true, 2097152, null)
on conflict (id) do nothing;

-- Public read (image previews in chat), authenticated write, owner-only delete.
drop policy if exists "attachments_read_public" on storage.objects;
create policy "attachments_read_public" on storage.objects
  for select using (bucket_id = 'attachments');

drop policy if exists "attachments_insert_auth" on storage.objects;
create policy "attachments_insert_auth" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments_update_auth" on storage.objects;
create policy "attachments_update_auth" on storage.objects
  for update using (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments_delete_own" on storage.objects;
create policy "attachments_delete_own" on storage.objects
  for delete using (bucket_id = 'attachments' and owner_id = (select auth.uid()::text));
