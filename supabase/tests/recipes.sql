\set ON_ERROR_STOP on
begin;
insert into auth.users(id, email) values
 ('11111111-1111-1111-1111-111111111111', 'kyler@accounts.cookmarked.edw20009.workers.dev'),
 ('22222222-2222-2222-2222-222222222222', 'ruby@accounts.cookmarked.edw20009.workers.dev');
insert into public.recipe(user_id,title,meal_type,course)
 select user_id,'Other recipe','N/A','N/A' from public.profile where username='ruby';
select user_id as owner_id from public.profile where username='kyler' \gset
select user_id as other_id from public.profile where username='ruby' \gset
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.recipe(user_id,title,meal_type,course,note,nutrition_info)
 values (:owner_id,'Soup','Dinner','Entree','Family favorite','100 kcal') returning recipe_id \gset
select set_config('test.recipe_id', :'recipe_id', true);
select set_config('test.other_id', :'other_id', true);
do $$ begin
 if (select count(*) from public.recipe) <> 1 then raise exception 'Other users recipes must be hidden'; end if;
 if not exists (select 1 from public.recipe where title='Soup' and note='Family favorite' and nutrition_info='100 kcal' and created_at is not null and updated_at is not null) then raise exception 'Inserted recipe must be readable with database defaults'; end if;
 begin
  insert into public.recipe(user_id,title,meal_type,course) values (current_setting('test.other_id')::integer,'Forged','N/A','N/A');
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
  insert into public.recipe(user_id,title,meal_type,course) values (1,'Anonymous','N/A','N/A');
  raise exception 'Anonymous insert accepted';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
