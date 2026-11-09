-- Allow signed-in users to review and remove only their own imported recipes.
-- This assumes public.temp_recipe already exists in the development database.
alter table public.temp_recipe enable row level security;

revoke all on public.temp_recipe from public, anon, authenticated;
grant select, delete on public.temp_recipe to authenticated;

drop policy if exists temp_recipe_read_own on public.temp_recipe;
drop policy if exists temp_recipe_delete_own on public.temp_recipe;
drop policy if exists temp_recipe_owner_boundary on public.temp_recipe;

create policy temp_recipe_read_own on public.temp_recipe
  for select to authenticated
  using (
    exists (
      select 1 from public.profile p
      where p.user_id = temp_recipe.user_id
        and p.auth_user_id = (select auth.uid())
    )
  );

create policy temp_recipe_delete_own on public.temp_recipe
  for delete to authenticated
  using (
    exists (
      select 1 from public.profile p
      where p.user_id = temp_recipe.user_id
        and p.auth_user_id = (select auth.uid())
    )
  );

-- A restrictive policy preserves the owner boundary if a permissive legacy
-- policy exists in a development project.
create policy temp_recipe_owner_boundary on public.temp_recipe as restrictive
  for all to authenticated
  using (
    exists (
      select 1 from public.profile p
      where p.user_id = temp_recipe.user_id
        and p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.profile p
      where p.user_id = temp_recipe.user_id
        and p.auth_user_id = (select auth.uid())
    )
  );
