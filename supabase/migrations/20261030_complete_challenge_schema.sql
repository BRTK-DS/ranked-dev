alter table public.challenges
  add column if not exists challenge_type text not null default 'code'
    check (challenge_type in ('code', 'completion')),
  add column if not exists tests_per_run integer not null default 3
    check (tests_per_run between 1 and 50),
  add column if not exists completion_config jsonb,
  add column if not exists random_test_config jsonb,
  add column if not exists briefing_config jsonb;

update public.challenges
set challenge_type = 'code'
where challenge_type is null;

notify pgrst, 'reload schema';
