begin;

-- Match JavaScript trim for required stored text, including Unicode whitespace.
create function public.recipe_text_present(value text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(pg_catalog.length(pg_catalog.btrim(value,
 U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')),0)>0
$$;
revoke all on function public.recipe_text_present(text) from public, anon;
grant execute on function public.recipe_text_present(text) to authenticated;

-- NOT VALID protects all new writes while preserving legacy rows for review.
-- Validate these constraints only after the read-only audit and approved cleanup.
alter table public.recipe
 add constraint recipe_title_content check (public.recipe_text_present(title)) not valid,
 add constraint recipe_prep_time_content check (public.recipe_text_present(prep_time)) not valid,
 add constraint recipe_ingredients_content check (public.recipe_text_present(ingredients)) not valid,
 add constraint recipe_instructions_content check (public.recipe_text_present(instructions)) not valid,
 add constraint recipe_servings_required check (servings is not null) not valid,
 add constraint recipe_url_format check (url is null or url='' or url ~* '^https?://[^[:space:]/?#]+[.][^[:space:]/?#.]+([/?#][^[:space:]]*)?$') not valid,
 add constraint recipe_thumbnail_url_format check (thumbnail_url is null or thumbnail_url='' or thumbnail_url ~* '^https?://[^[:space:]/?#]+([/?#][^[:space:]]*)?$') not valid;

create or replace function public.convert_temp_recipe(p_temp_recipe_id integer, p_recipe jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id integer;
  saved_id integer;
  removed_count integer;
  field text;
  amount numeric;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_temp_recipe_id is null or p_temp_recipe_id < 1 then
    raise exception 'Invalid temporary recipe ID' using errcode='22023';
  end if;
  select user_id into owner_id from public.profile where auth_user_id=auth.uid();
  if owner_id is null then raise insufficient_privilege; end if;

  -- Serialize conversions of the same temporary row, including simultaneous
  -- retries. This fixed two-key namespace avoids locking unrelated operations.
  perform pg_catalog.pg_advisory_xact_lock(73104, p_temp_recipe_id);
  select recipe_id into saved_id from public.recipe_conversion
    where user_id=owner_id and temp_recipe_id=p_temp_recipe_id;
  if found then return pg_catalog.jsonb_build_object('recipeId', saved_id); end if;

  perform 1 from public.temp_recipe where recipe_id=p_temp_recipe_id and user_id=owner_id;
  if not found then raise no_data_found; end if;
  if pg_catalog.jsonb_typeof(p_recipe) is distinct from 'object' then
    raise exception 'Invalid recipe data' using errcode='22023';
  end if;
  -- Wire types are checked before ->> can coerce arrays/objects to text.
  foreach field in array array['title','prep_time','ingredients','instructions','meal_type','course'] loop
    if pg_catalog.jsonb_typeof(p_recipe->field) is distinct from 'string'
       or not public.recipe_text_present(p_recipe->>field) then
      raise exception 'Invalid recipe field' using errcode='22023', hint=field;
    end if;
  end loop;
  foreach field in array array['url','note','nutrition_info','description','shared_from_platform','thumbnail_url'] loop
    if p_recipe ? field and pg_catalog.jsonb_typeof(p_recipe->field) not in ('string','null') then
      raise exception 'Invalid recipe field' using errcode='22023', hint=field;
    end if;
  end loop;
  if pg_catalog.jsonb_typeof(p_recipe->'servings') is distinct from 'number' then
    raise exception 'Invalid recipe field' using errcode='22023', hint='servings';
  end if;
  amount := (p_recipe->>'servings')::numeric;
  if amount <> pg_catalog.trunc(amount) or amount < -2147483648 or amount > 2147483647 then
    raise exception 'Invalid recipe field' using errcode='22023', hint='servings';
  end if;
  p_recipe := pg_catalog.jsonb_set(p_recipe, '{servings}', pg_catalog.to_jsonb(amount::integer));
  insert into public.recipe (
    user_id,title,prep_time,servings,ingredients,instructions,meal_type,course,
    url,note,nutrition_info,description,shared_from_platform,thumbnail_url
  ) values (
    owner_id,p_recipe->>'title',p_recipe->>'prep_time',(p_recipe->>'servings')::integer,
    p_recipe->>'ingredients',p_recipe->>'instructions',p_recipe->>'meal_type',p_recipe->>'course',
    p_recipe->>'url',p_recipe->>'note',p_recipe->>'nutrition_info',p_recipe->>'description',
    p_recipe->>'shared_from_platform',p_recipe->>'thumbnail_url'
  ) returning recipe_id into saved_id;
  insert into public.recipe_conversion(user_id,temp_recipe_id,recipe_id)
    values(owner_id,p_temp_recipe_id,saved_id);
  delete from public.temp_recipe where recipe_id=p_temp_recipe_id and user_id=owner_id;
  get diagnostics removed_count = row_count;
  if removed_count <> 1 then raise no_data_found; end if;
  return pg_catalog.jsonb_build_object('recipeId', saved_id);
end;
$$;
commit;
