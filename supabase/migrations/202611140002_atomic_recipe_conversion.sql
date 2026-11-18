begin;

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

commit;
