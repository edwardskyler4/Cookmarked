\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from public.recipe where title='Legacy integrity fixture' and note='Preserve existing notes' and prep_time is null and ingredients is null and instructions is null and servings is null) then
  raise exception 'Integrity migration must preserve existing data for review';
 end if;
 if (select count(*) from pg_catalog.pg_constraint where conrelid='public.recipe'::regclass and conname in ('recipe_title_content','recipe_prep_time_content','recipe_ingredients_content','recipe_instructions_content','recipe_servings_required','recipe_url_format','recipe_thumbnail_url_format') and not convalidated) <> 7 then
  raise exception 'Legacy data validation must be an explicit later step';
 end if;
end $$;
delete from public.recipe where title='Legacy integrity fixture';
delete from auth.users where id='55555555-5555-5555-5555-555555555555';
