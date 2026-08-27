-- Persist AI Coach conversation history per member
alter table public.member_progress
  add column if not exists coach_chat_history jsonb not null default '[]'::jsonb;
