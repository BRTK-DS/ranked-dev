alter table public.challenges
  add column if not exists language text not null default 'JavaScript',
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

update public.challenges set language = 'PHP' where title ilike '[PHP%' or initial_code ilike '%<?php%';
update public.challenges set language = 'C#' where title ilike '[C#%' or initial_code ilike '%using System%';
update public.challenges set language = 'HTML' where title ilike '[HTML%';
update public.challenges set language = 'XML' where title ilike '[XML%' or initial_code ilike '<?xml%';
update public.challenges set language = 'XSLT' where title ilike '%XSLT%' or initial_code ilike '%xsl:stylesheet%' or initial_code ilike '%xsl:transform%';
update public.challenges set language = 'XPath' where title ilike '%XPath%';
update public.challenges set language = 'GraphQL' where title ilike '[GraphQL%';
update public.challenges set language = 'SQL' where title ilike '[SQL%';

notify pgrst, 'reload schema';
