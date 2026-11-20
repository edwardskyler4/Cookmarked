begin;

-- Allow signed-in users to delete only their own saved recipes.
alter table public.recipe enable row level security;

grant delete on public.recipe to authenticated;

-- Replace the manually created policy with the version-controlled policy.
drop policy if exists "Users can delete their own recipes" on public.recipe;
drop policy if exists recipe_delete_own on public.recipe;

create policy recipe_delete_own on public.recipe
  for delete to authenticated
  using (
    exists (
      select 1 from public.profile p
      where p.user_id = recipe.user_id
        and p.auth_user_id = (select auth.uid())
    )
  );

commit;