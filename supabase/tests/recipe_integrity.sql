\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values ('44444444-4444-4444-4444-444444444444','integrity@accounts.cookmarked.edw20009.workers.dev');
insert into public.temp_recipe(user_id,title) select user_id,'Integrity source' from public.profile where username='integrity' returning recipe_id as temp_id \gset
select set_config('test.integrity_temp', :'temp_id', true);
set local role authenticated;
set local request.jwt.claim.sub='44444444-4444-4444-4444-444444444444';
do $$
declare
 valid jsonb := '{"title":"Soup","prep_time":"10 min","ingredients":"Water","instructions":"Boil","servings":4,"meal_type":"N/A","course":"N/A"}';
 bad jsonb;
 field text;
 owner_id integer;
begin
 select user_id into owner_id from public.profile where auth_user_id=auth.uid();
 -- Direct inserts must obey the same persistent requirements as RPC writes.
 foreach field in array array['title','prep_time','ingredients','instructions','servings'] loop
  begin
   insert into public.recipe(user_id,title,prep_time,ingredients,instructions,servings,meal_type,course)
    values(owner_id,case when field='title' then ' ' else 'Soup' end,
     case when field='prep_time' then null else '10 min' end,
     case when field='ingredients' then E'\t\n' else 'Water' end,
     case when field='instructions' then U&'\00A0' else 'Boil' end,
     case when field='servings' then null else 4 end,'N/A','N/A');
   raise exception 'Invalid direct insert accepted for %',field;
  exception when check_violation then null; end;
 end loop;
 for bad in select value from jsonb_array_elements('[
  {"title":" "},{"title":null},{"title":{}},{"prep_time":[]},
  {"ingredients":["Water"]},{"instructions":false},{"servings":"4"},
  {"servings":null},{"servings":1.5},{"servings":2147483648},
  {"description":{}},{"note":[]},{"nutrition_info":true},
  {"meal_type":"Unknown"},{"course":"Unknown"},
  {"url":"javascript:alert(1)"},{"thumbnail_url":"ftp://example.com/a"}
 ]') loop
  begin
   perform public.convert_temp_recipe(current_setting('test.integrity_temp')::integer,valid || bad);
   raise exception 'Invalid RPC payload accepted: %',bad;
  exception when invalid_parameter_value or check_violation then null; end;
  if exists(select 1 from public.recipe) or exists(select 1 from public.recipe_conversion) then raise exception 'Rejected conversion left writes behind'; end if;
  if not exists(select 1 from public.temp_recipe where recipe_id=current_setting('test.integrity_temp')::integer) then raise exception 'Rejected conversion removed its source'; end if;
 end loop;
 -- Required fields cannot be omitted, and integral JSON decimals are valid.
 begin
  perform public.convert_temp_recipe(current_setting('test.integrity_temp')::integer, valid - 'ingredients');
  raise exception 'Missing required RPC field accepted';
 exception when invalid_parameter_value then null; end;
 perform public.convert_temp_recipe(current_setting('test.integrity_temp')::integer, valid || '{"servings":-2.0,"user_id":999,"recipe_id":999}');
 if not exists(select 1 from public.recipe where user_id=owner_id and servings=-2 and recipe_id<>999) then raise exception 'Conversion must preserve permitted integers and derive identity'; end if;
end $$;
rollback;
