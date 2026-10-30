alter table public.challenges
  drop constraint if exists challenges_difficulty_check;

alter table public.challenges
  add constraint challenges_difficulty_check
  check (difficulty in ('Easy', 'Medium', 'Hard', 'Insane'));

create or replace function public.finalize_submission(p_submission_id uuid, p_status text, p_execution_time_ms integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_difficulty text;
  v_xp integer;
  v_rr integer;
begin
  if p_status not in ('accepted', 'wrong_answer', 'runtime_error', 'time_limit') then raise exception 'invalid status'; end if;
  select s.user_id, c.difficulty into v_user, v_difficulty
  from public.submissions s
  join public.challenges c on c.id = s.challenge_id
  where s.id = p_submission_id and s.status in ('queued', 'running')
  for update;
  if v_user is null then raise exception 'submission unavailable'; end if;
  update public.submissions set status = p_status, execution_time_ms = p_execution_time_ms where id = p_submission_id;
  if p_status = 'accepted' then
    v_xp := case v_difficulty when 'Easy' then 50 when 'Medium' then 100 when 'Hard' then 180 else 300 end;
    v_rr := case v_difficulty when 'Easy' then 15 when 'Medium' then 25 when 'Hard' then 40 else 65 end;
    update public.profiles
    set xp = xp + v_xp,
        rating = rating + v_rr,
        rank = case when rating + v_rr >= 2000 then 'Radiant' when rating + v_rr >= 1500 then 'Diamond' when rating + v_rr >= 1000 then 'Gold' when rating + v_rr >= 500 then 'Silver' else 'Iron' end
    where id = v_user;
  end if;
end;
$$;

revoke all on function public.finalize_submission(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.finalize_submission(uuid, text, integer) to service_role;

notify pgrst, 'reload schema';
