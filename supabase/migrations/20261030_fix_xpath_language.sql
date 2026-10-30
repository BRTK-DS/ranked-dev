update public.challenges
set language = 'XPath'
where title ilike '%XPath%';

notify pgrst, 'reload schema';
