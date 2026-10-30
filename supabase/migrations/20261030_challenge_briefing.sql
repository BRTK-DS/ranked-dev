alter table public.challenges
  add column if not exists briefing_config jsonb;
