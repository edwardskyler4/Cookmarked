begin;

create policy profile_update_own
  on public.profile
  for update
  to authenticated
  using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

commit;
