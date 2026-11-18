begin;

-- The hosted table already has note and nutrition_info. Metadata descriptions
-- are separate content; adding a nullable column preserves every existing row.
alter table public.recipe add column if not exists description text;

commit;
