begin;

create function public.recipe_text_present(value text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(pg_catalog.length(pg_catalog.btrim(value,
 U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')),0)>0
$$;
revoke all on function public.recipe_text_present(text) from public, anon;
grant execute on function public.recipe_text_present(text) to authenticated;

alter table public.recipe
 add constraint recipe_title_content check (public.recipe_text_present(title)) not valid,
 add constraint recipe_prep_time_content check (public.recipe_text_present(prep_time)) not valid,
 add constraint recipe_ingredients_content check (public.recipe_text_present(ingredients)) not valid,
 add constraint recipe_instructions_content check (public.recipe_text_present(instructions)) not valid,
 add constraint recipe_servings_required check (servings is not null) not valid,
 add constraint recipe_url_format check (url is null or url='' or url ~* '^https?://[^[:space:]/?#]+[.][^[:space:]/?#.]+([/?#][^[:space:]]*)?$') not valid,
 add constraint recipe_thumbnail_url_format check (thumbnail_url is null or thumbnail_url='' or thumbnail_url ~* '^https?://[^[:space:]/?#]+([/?#][^[:space:]]*)?$') not valid;

commit;
