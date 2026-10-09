\set ON_ERROR_STOP on
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', 'kyler@accounts.cookmarked.edw20009.workers.dev', '{"username":"untrusted"}'),
 ('22222222-2222-2222-2222-222222222222', 'ruby@accounts.cookmarked.edw20009.workers.dev', '{}');
do $$ begin
 if not exists (select 1 from public."Users" where username = 'kyler' and auth_user_id = '11111111-1111-1111-1111-111111111111') then
   raise exception 'Registration must create the profile using the canonical Auth identifier';
 end if;
end $$;
-- Duplicate canonical username must fail at the storage boundary.
do $$ begin
 begin
  insert into public."Users"(username, auth_user_id) values ('KYLER', '33333333-3333-3333-3333-333333333333');
  raise exception 'Duplicate username was accepted';
 exception when unique_violation then null;
 end;
end $$;
-- Failed profile creation must roll back account creation.
do $$ begin
 begin
  insert into auth.users(id, email) values ('33333333-3333-3333-3333-333333333333', 'bad-name@accounts.cookmarked.edw20009.workers.dev');
  raise exception 'Invalid identity was accepted';
 exception when check_violation then null;
 end;
 if exists (select 1 from auth.users where id = '33333333-3333-3333-3333-333333333333') then raise exception 'Orphaned account'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin
 if (select count(*) from public."Users") <> 1 then raise exception 'RLS must hide other profiles even with an old permissive policy'; end if;
 if (select username from public."Users") <> 'kyler' then raise exception 'Wrong profile visible'; end if;
 begin
   update public."Users" set username = 'changed';
   raise exception 'Client profile update accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
   perform * from public."Users";
   raise exception 'Anonymous profile access accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
-- Changing an identifier would break username login; admin password resets remain allowed.
do $$ begin
 begin
  update auth.users set email = 'new@accounts.cookmarked.edw20009.workers.dev' where id = '11111111-1111-1111-1111-111111111111';
  raise exception 'Identity change accepted';
 exception when check_violation then null;
 end;
end $$;
set local role supabase_auth_admin;
do $$ begin
 if public.suppress_auth_email('{}'::jsonb) <> '{}'::jsonb then raise exception 'Email hook must return success without delivery'; end if;
end $$;
reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
 if exists(select 1 from public."Users" where username = 'kyler') then raise exception 'Deleted accounts must remove their profiles'; end if;
end $$;
rollback;
