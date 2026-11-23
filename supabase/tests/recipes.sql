\set ON_ERROR_STOP on
begin;
insert into auth.users(id, email) values
 ('11111111-1111-1111-1111-111111111111', 'kyler@accounts.cookmarked.edw20009.workers.dev'),
 ('22222222-2222-2222-2222-222222222222', 'ruby@accounts.cookmarked.edw20009.workers.dev');
insert into public.recipe(user_id,title,meal_type,course,prep_time,ingredients,instructions,servings)
 select user_id,'Other recipe','N/A','N/A','10 min','Water','Boil',4 from public.profile where username='ruby';
select user_id as owner_id from public.profile where username='kyler' \gset
select user_id as other_id from public.profile where username='ruby' \gset
-- Metadata description must be independent of personal notes and nutrition.
insert into public.recipe(user_id,title,meal_type,course,note,nutrition_info,description,prep_time,ingredients,instructions,servings)
 select user_id,'Schema check','N/A','N/A','Keep notes','Keep nutrition','Imported description','10 min','Water','Boil',4
 from public.profile where username='kyler';
do $$ begin
 if not exists(select 1 from public.recipe where title='Schema check' and note='Keep notes'
   and nutrition_info='Keep nutrition' and description='Imported description') then
   raise exception 'Metadata must preserve notes and nutrition';
 end if;
end $$;
delete from public.recipe where title='Schema check';
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.recipe(user_id,title,meal_type,course,note,nutrition_info,prep_time,ingredients,instructions,servings)
 values (:owner_id,'Soup','Dinner','Entree','Family favorite','100 kcal','10 min','Water','Boil',4) returning recipe_id \gset
select set_config('test.recipe_id', :'recipe_id', true);
select set_config('test.other_id', :'other_id', true);
do $$ begin
 if (select count(*) from public.recipe) <> 1 then raise exception 'Other users recipes must be hidden'; end if;
 if not exists (select 1 from public.recipe where title='Soup' and note='Family favorite' and nutrition_info='100 kcal' and created_at is not null and updated_at is not null) then raise exception 'Inserted recipe must be readable with database defaults'; end if;
 begin
  insert into public.recipe(user_id,title,meal_type,course,prep_time,ingredients,instructions,servings) values (current_setting('test.other_id')::integer,'Forged','N/A','N/A','10 min','Water','Boil',4);
  raise exception 'Forged owner accepted';
 exception when insufficient_privilege then null; end;
 begin
  update public.recipe set title='Changed';
  raise exception 'Unrequested update access granted';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.recipe;
  raise exception 'Unrequested delete access granted';
 exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
 if exists(select 1 from public.recipe where recipe_id=current_setting('test.recipe_id')::integer) then raise exception 'Second account can read first account recipe'; end if;
 if (select count(*) from public.recipe) <> 1 then raise exception 'Second account must see only its own recipe'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform * from public.recipe;
  raise exception 'Anonymous read accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.recipe(user_id,title,meal_type,course,prep_time,ingredients,instructions,servings) values (1,'Anonymous','N/A','N/A','10 min','Water','Boil',4);
  raise exception 'Anonymous insert accepted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;

-- Atomic conversion and idempotency under the same RLS used by Edge Functions.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-1111-1111-111111111111','kyler@accounts.cookmarked.edw20009.workers.dev'),
 ('22222222-2222-2222-2222-222222222222','ruby@accounts.cookmarked.edw20009.workers.dev');
insert into public.temp_recipe(user_id,title)
 select user_id,'Convert me' from public.profile where username='kyler' returning recipe_id as temp_id \gset
insert into public.temp_recipe(user_id,title)
 select user_id,'Other owner' from public.profile where username='ruby' returning recipe_id as other_temp_id \gset
select set_config('test.temp_id', :'temp_id', true);
select set_config('test.other_temp_id', :'other_temp_id', true);
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.convert_temp_recipe(:temp_id, '{"title":"Converted","prep_time":"10 min","ingredients":"Water","instructions":"Boil","servings":4,"meal_type":"Dinner","course":"Entree","note":"Notes","nutrition_info":"100 kcal","description":"Description"}') as converted \gset
select set_config('test.converted', :'converted', true);
do $$
declare retried jsonb;
begin
 if exists(select 1 from public.temp_recipe where recipe_id=current_setting('test.temp_id')::integer) then
   raise exception 'Temporary recipe was not removed after saving';
 end if;
 if not exists(select 1 from public.recipe where title='Converted' and note='Notes' and nutrition_info='100 kcal' and description='Description') then
   raise exception 'Conversion lost recipe fields';
 end if;
 retried := public.convert_temp_recipe(current_setting('test.temp_id')::integer, '{"title":"Retry","meal_type":"N/A","course":"N/A"}');
 if retried <> current_setting('test.converted')::jsonb or (select count(*) from public.recipe) <> 1 then
   raise exception 'Retry must return the first recipe without inserting again';
 end if;
 begin
   perform public.convert_temp_recipe(current_setting('test.other_temp_id')::integer, '{"title":"Forged","meal_type":"N/A","course":"N/A"}');
   raise exception 'Other owner conversion accepted';
 exception when no_data_found then null; end;
 if (select count(*) from public.recipe) <> 1 then raise exception 'Unauthorized conversion inserted a recipe'; end if;
end $$;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
 if exists(select 1 from public.recipe_conversion) then raise exception 'Another owner can read conversion receipts'; end if;
 begin
   perform public.convert_temp_recipe(current_setting('test.temp_id')::integer, '{"title":"Forged","meal_type":"N/A","course":"N/A"}');
   raise exception 'Another owner reused conversion receipt';
 exception when no_data_found then null; end;
end $$;
reset role;

-- If cleanup fails, the whole statement must roll back, including the receipt.
insert into public.temp_recipe(user_id,title)
 select user_id,'Rollback' from public.profile where username='kyler' returning recipe_id as rollback_id \gset
select set_config('test.rollback_id', :'rollback_id', true);
create function public.fail_conversion_cleanup() returns trigger language plpgsql as $$
begin raise exception 'Simulated cleanup failure' using errcode='23514'; end $$;
create trigger fail_conversion_cleanup before delete on public.temp_recipe
 for each row execute function public.fail_conversion_cleanup();
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin
 begin
   perform public.convert_temp_recipe(current_setting('test.rollback_id')::integer, '{"title":"Must roll back","prep_time":"10 min","ingredients":"Water","instructions":"Boil","servings":4,"meal_type":"N/A","course":"N/A"}');
   raise exception 'Cleanup failure was hidden';
 exception when check_violation then
   if sqlerrm <> 'Simulated cleanup failure' then raise; end if;
 end;
 if exists(select 1 from public.recipe where title='Must roll back') then raise exception 'Failed conversion left a permanent recipe'; end if;
 if exists(select 1 from public.recipe_conversion where temp_recipe_id=current_setting('test.rollback_id')::integer) then raise exception 'Failed conversion left a receipt'; end if;
 if not exists(select 1 from public.temp_recipe where recipe_id=current_setting('test.rollback_id')::integer) then raise exception 'Failed conversion lost the temporary recipe'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
   perform public.convert_temp_recipe(1, '{}');
   raise exception 'Anonymous conversion accepted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
