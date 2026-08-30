alter table public.member_plans
  add column if not exists generated_by text;
