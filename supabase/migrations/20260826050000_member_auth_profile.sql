-- App auth profiles for mobile signup/login
-- Stores first/last name on members and auto-creates a row when a user registers.

alter table public.members
  add column if not exists first_name text,
  add column if not exists last_name text;

create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last text := coalesce(new.raw_user_meta_data->>'last_name', '');
  v_name text := trim(both from (v_first || ' ' || v_last));
begin
  if new.email is null then
    return new;
  end if;

  if exists (select 1 from public.admin_users a where a.id = new.id) then
    return new;
  end if;

  if v_name = '' then
    v_name := coalesce(split_part(new.email, '@', 1), 'Member');
  end if;

  insert into public.members (id, email, name, first_name, last_name, status)
  values (new.id::text, new.email, v_name, nullif(v_first, ''), nullif(v_last, ''), 'active')
  on conflict (email) do update
    set
      first_name = coalesce(excluded.first_name, public.members.first_name),
      last_name = coalesce(excluded.last_name, public.members.last_name),
      name = excluded.name,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_member on auth.users;
create trigger on_auth_user_created_member
  after insert on auth.users
  for each row execute function public.handle_new_member();
