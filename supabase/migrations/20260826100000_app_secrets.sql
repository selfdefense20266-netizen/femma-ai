-- Optional: store OpenAI key server-side (service_role only)
-- Prefer Supabase Dashboard → Edge Functions → Secrets → OPENAI_API_KEY

create table if not exists public.app_secrets (
  id text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;

revoke all on table public.app_secrets from anon, authenticated;
grant select on table public.app_secrets to service_role;
