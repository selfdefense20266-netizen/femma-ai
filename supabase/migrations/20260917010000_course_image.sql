-- Allow admins to attach a cover image to a course, shown on the course detail hero in the app.

alter table public.courses add column if not exists image_url text;
