do $$
declare
  current_type text;
begin
  select data_type
  into current_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'challenges'
    and column_name = 'language';

  if current_type in ('json', 'jsonb') then
    alter table public.challenges
      alter column language drop default;

    alter table public.challenges
      alter column language type text
      using (language #>> '{}');
  end if;
end
$$;

update public.challenges
set language = 'JavaScript'
where language is null or btrim(language) = '';

alter table public.challenges
  alter column language set default 'JavaScript',
  alter column language set not null;

update public.challenges
set language = 'XPath'
where title ilike '%XPath%';

notify pgrst, 'reload schema';
