begin;

-- The recipe table already exists. Add only access control for recipe creation.
alter table public.recipe enable row level security;
revoke all on public.recipe from public, anon, authenticated;
grant select, insert on public.recipe to authenticated;

-- Resolve the existing identity sequence rather than assuming its name.
do $$
declare identity_sequence text;
begin
  identity_sequence := pg_get_serial_sequence('public.recipe', 'recipe_id');
  if identity_sequence is not null then
    execute format('revoke all on sequence %s from public, anon, authenticated', identity_sequence);
    execute format('grant usage on sequence %s to authenticated', identity_sequence);
  end if;
end $$;

drop policy if exists recipe_read_own on public.recipe;
drop policy if exists recipe_insert_own on public.recipe;
drop policy if exists recipe_owner_boundary on public.recipe;

create policy recipe_read_own on public.recipe
  for select to authenticated using (
    exists (select 1 from public.profile p
      where p.user_id = recipe.user_id and p.auth_user_id = (select auth.uid()))
  );
create policy recipe_insert_own on public.recipe
  for insert to authenticated with check (
    exists (select 1 from public.profile p
      where p.user_id = recipe.user_id and p.auth_user_id = (select auth.uid()))
  );
-- Keep ownership enforced even if a permissive legacy policy exists.
create policy recipe_owner_boundary on public.recipe as restrictive
  for all to authenticated
  using (exists (select 1 from public.profile p
    where p.user_id = recipe.user_id and p.auth_user_id = (select auth.uid())))
  with check (exists (select 1 from public.profile p
    where p.user_id = recipe.user_id and p.auth_user_id = (select auth.uid())));

commit;
