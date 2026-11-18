begin;

alter table public.recipe add column if not exists description text;

commit;
