-- Public thumbnails bucket for admin image uploads (courses, recovery, program, journeys)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thumbnails',
  'thumbnails',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Read for everyone (public bucket)
drop policy if exists "Public read thumbnails" on storage.objects;
create policy "Public read thumbnails"
  on storage.objects for select
  using (bucket_id = 'thumbnails');

-- Upload / update / delete for anon + authenticated (admin uses anon/service key in this app)
drop policy if exists "Public upload thumbnails" on storage.objects;
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
