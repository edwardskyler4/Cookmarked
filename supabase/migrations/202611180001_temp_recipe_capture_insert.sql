-- Allow the authenticated capture function to create inbox rows only for the
-- profile belonging to the current Auth user.
grant insert on public.temp_recipe to authenticated;

drop policy if exists temp_recipe_insert_own on public.temp_recipe;

create policy temp_recipe_insert_own on public.temp_recipe
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profile p
      where p.user_id = temp_recipe.user_id
        and p.auth_user_id = (select auth.uid())
    )
  );
