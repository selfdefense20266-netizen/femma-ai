-- Ensure thumbnails bucket exists and accepts common image types
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thumbnails',
  'thumbnails',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif'
  ]::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Recreate permissive policies (admin app uses anon key)
drop policy if exists "Public read thumbnails" on storage.objects;
create policy "Public read thumbnails"
  on storage.objects for select
  using (bucket_id = 'thumbnails');

drop policy if exists "Public upload thumbnails" on storage.objects;
drop policy if exists "Public insert thumbnails" on storage.objects;
create policy "Public upload thumbnails"
  on storage.objects for insert
  with check (bucket_id = 'thumbnails');

drop policy if exists "Public update thumbnails" on storage.objects;
create policy "Public update thumbnails"
  on storage.objects for update
  using (bucket_id = 'thumbnails')
  with check (bucket_id = 'thumbnails');

drop policy if exists "Public delete thumbnails" on storage.objects;
create policy "Public delete thumbnails"
  on storage.objects for delete
  using (bucket_id = 'thumbnails');
