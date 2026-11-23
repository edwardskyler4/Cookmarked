begin;

-- Keep receipts after deleting the temporary row so a lost HTTP response can
-- be retried. Receipts are scoped to the profile, never supplied by the caller.
create table public.recipe_conversion (
  user_id integer not null references public.profile(user_id),
  temp_recipe_id integer not null,
  recipe_id integer not null references public.recipe(recipe_id) on delete cascade,
  primary key (user_id, temp_recipe_id)
);
alter table public.recipe_conversion enable row level security;
revoke all on public.recipe_conversion from public, anon, authenticated;
grant select, insert on public.recipe_conversion to authenticated;
create policy recipe_conversion_read_own on public.recipe_conversion
 for select to authenticated using (
  exists(select 1 from public.profile p
   where p.user_id=recipe_conversion.user_id and p.auth_user_id=(select auth.uid()))
 );
create policy recipe_conversion_insert_own on public.recipe_conversion
 for insert to authenticated with check (
  exists(select 1 from public.profile p
   where p.user_id=recipe_conversion.user_id and p.auth_user_id=(select auth.uid()))
  and exists(select 1 from public.recipe r
   where r.recipe_id=recipe_conversion.recipe_id and r.user_id=recipe_conversion.user_id)
  and exists(select 1 from public.temp_recipe t
   where t.recipe_id=recipe_conversion.temp_recipe_id and t.user_id=recipe_conversion.user_id)
 );

create function public.convert_temp_recipe(p_temp_recipe_id integer, p_recipe jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id integer;
  saved_id integer;
  removed_count integer;
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
revoke all on function public.convert_temp_recipe(integer,jsonb) from public, anon, authenticated;
grant execute on function public.convert_temp_recipe(integer,jsonb) to authenticated;

commit;
