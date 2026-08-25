-- Mux video fields on lessons
alter table public.lessons
  add column if not exists mux_upload_id text,
  add column if not exists mux_asset_id text,
  add column if not exists mux_playback_id text,
  add column if not exists video_status text not null default 'awaiting'
    check (video_status in ('awaiting', 'uploading', 'processing', 'ready', 'errored'));

create index if not exists lessons_mux_upload_id_idx on public.lessons (mux_upload_id);
create index if not exists lessons_mux_asset_id_idx on public.lessons (mux_asset_id);
create index if not exists lessons_video_status_idx on public.lessons (video_status);

update public.lessons
set video_status = case when video_url is not null and video_url <> '' then 'ready' else 'awaiting' end
where true;
