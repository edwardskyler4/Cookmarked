-- READ ONLY. Run before/after the integrity migration; no recipe contents leave
-- the database. Review remediation separately; do not silently fill legacy data.
with whitespace(characters) as (values (U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'))
select
 count(*) as total_recipes,
 count(*) filter (where title is null or pg_catalog.length(pg_catalog.btrim(title,characters))=0) as missing_title,
 count(*) filter (where prep_time is null or pg_catalog.length(pg_catalog.btrim(prep_time,characters))=0) as missing_prep_time,
 count(*) filter (where ingredients is null or pg_catalog.length(pg_catalog.btrim(ingredients,characters))=0) as missing_ingredients,
 count(*) filter (where instructions is null or pg_catalog.length(pg_catalog.btrim(instructions,characters))=0) as missing_instructions,
 count(*) filter (where servings is null) as missing_servings,
 count(*) filter (where url is not null and url<>'' and url !~* '^https?://[^[:space:]/?#]+[.][^[:space:]/?#.]+([/?#][^[:space:]]*)?$') as invalid_source_urls,
 count(*) filter (where thumbnail_url is not null and thumbnail_url<>'' and thumbnail_url !~* '^https?://[^[:space:]/?#]+([/?#][^[:space:]]*)?$') as invalid_thumbnail_urls
from public.recipe cross join whitespace;

select conname, convalidated from pg_catalog.pg_constraint
where conrelid='public.recipe'::regclass order by conname;
