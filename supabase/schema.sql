create extension if not exists pgcrypto;
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text not null unique check (char_length(username) between 3 and 32), xp integer not null default 0 check (xp >= 0), rank text not null default 'Iron', rating integer not null default 0 check (rating >= 0), is_admin boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.challenges (id uuid primary key default gen_random_uuid(), title text not null check (char_length(title) between 3 and 120), description text not null, difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')), challenge_type text not null default 'code' check (challenge_type in ('code', 'completion')), initial_code text not null, test_cases jsonb not null default '[]'::jsonb check (jsonb_typeof(test_cases) = 'array'), tests_per_run integer not null default 3 check (tests_per_run between 1 and 50), completion_config jsonb, random_test_config jsonb, created_at timestamptz not null default now());
create table if not exists public.submissions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, challenge_id uuid not null references public.challenges(id) on delete cascade, status text not null default 'queued' check (status in ('queued', 'running', 'accepted', 'wrong_answer', 'runtime_error', 'time_limit')), code text not null check (char_length(code) <= 100000), execution_time_ms integer check (execution_time_ms is null or execution_time_ms >= 0), created_at timestamptz not null default now());
create index if not exists submissions_user_created_idx on public.submissions(user_id, created_at desc);
create index if not exists submissions_challenge_idx on public.submissions(challenge_id);
alter table public.profiles enable row level security; alter table public.challenges enable row level security; alter table public.submissions enable row level security;
create policy "profiles readable by owner" on public.profiles for select to authenticated using (id = auth.uid());
create policy "challenges publicly readable" on public.challenges for select using (true);
create policy "admins create challenges" on public.challenges for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "admins update challenges" on public.challenges for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "users read own submissions" on public.submissions for select to authenticated using (user_id = auth.uid());
create policy "users only queue own submissions" on public.submissions for insert to authenticated with check (user_id = auth.uid() and status = 'queued' and execution_time_ms is null);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.profiles (id, username) values (new.id, left(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1), 'player'), 24) || '_' || substr(new.id::text, 1, 5)); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.finalize_submission(p_submission_id uuid, p_status text, p_execution_time_ms integer) returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_difficulty text; v_xp integer; v_rr integer;
begin
  if p_status not in ('accepted', 'wrong_answer', 'runtime_error', 'time_limit') then raise exception 'invalid status'; end if;
  select s.user_id, c.difficulty into v_user, v_difficulty from public.submissions s join public.challenges c on c.id = s.challenge_id where s.id = p_submission_id and s.status in ('queued','running') for update;
  if v_user is null then raise exception 'submission unavailable'; end if;
  update public.submissions set status = p_status, execution_time_ms = p_execution_time_ms where id = p_submission_id;
  if p_status = 'accepted' then
    v_xp := case v_difficulty when 'Easy' then 50 when 'Medium' then 100 else 180 end; v_rr := case v_difficulty when 'Easy' then 15 when 'Medium' then 25 else 40 end;
    update public.profiles set xp = xp + v_xp, rating = rating + v_rr, rank = case when rating + v_rr >= 2000 then 'Radiant' when rating + v_rr >= 1500 then 'Diamond' when rating + v_rr >= 1000 then 'Gold' when rating + v_rr >= 500 then 'Silver' else 'Iron' end where id = v_user;
  end if;
end; $$;
revoke all on function public.finalize_submission(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.finalize_submission(uuid,text,integer) to service_role;

insert into public.challenges (id, title, description, difficulty, initial_code, test_cases) values
('00000000-0000-4000-8000-000000000001', 'Two Sum: Ranked Queue', 'Return the indices of two numbers that add up to target. Exactly one valid answer exists.', 'Easy', E'function solve(nums, target) {\n  // lock in your answer\n  \n}', '[{"input":"[[2,7,11,15],9]","expected":"[0,1]"},{"input":"[[3,2,4],6]","expected":"[1,2]"}]'),
('00000000-0000-4000-8000-000000000002', 'Longest Win Streak', 'Given an array of match results, return the longest consecutive run of wins.', 'Medium', E'function solve(results) {\n  // W = win, L = loss\n  \n}', '[{"input":"[[\"W\",\"W\",\"L\",\"W\"]]","expected":"2"},{"input":"[[\"W\",\"W\",\"W\"]]","expected":"3"}]'),
('00000000-0000-4000-8000-000000000003', 'Balanced Matchmaking', 'Return true when the difference between the highest and lowest player rating is at most 100.', 'Hard', E'function solve(ratings) {\n  \n}', '[{"input":"[[1200,1250,1299]]","expected":"true"},{"input":"[[900,1200]]","expected":"false"}]')
on conflict (id) do nothing;
