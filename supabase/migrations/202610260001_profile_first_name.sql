begin;

alter table public.profile
  add column if not exists first_name text;

grant update (first_name) on public.profile to authenticated;

commit;
