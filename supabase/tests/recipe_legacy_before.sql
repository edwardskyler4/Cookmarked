\set ON_ERROR_STOP on
insert into auth.users(id,email) values('55555555-5555-5555-5555-555555555555','legacycheck@accounts.cookmarked.edw20009.workers.dev');
insert into public.recipe(user_id,title,note,meal_type,course)
 select user_id,'Legacy integrity fixture','Preserve existing notes','N/A','N/A' from public.profile where auth_user_id='55555555-5555-5555-5555-555555555555';
