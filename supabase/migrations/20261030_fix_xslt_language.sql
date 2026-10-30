update public.challenges
set language = 'XSLT'
where title ilike '%XSLT%'
   or initial_code ilike '%xsl:stylesheet%'
   or initial_code ilike '%xsl:transform%';

notify pgrst, 'reload schema';
