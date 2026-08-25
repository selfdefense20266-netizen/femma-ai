-- Mux API credentials for edge functions (service_role only; no public policies)
create table if not exists public.mux_credentials (
  id text primary key default 'default',
  token_id text not null,
  token_secret text not null,
  updated_at timestamptz not null default now()
);

alter table public.mux_credentials enable row level security;

revoke all on table public.mux_credentials from anon, authenticated;
grant select on table public.mux_credentials to service_role;
