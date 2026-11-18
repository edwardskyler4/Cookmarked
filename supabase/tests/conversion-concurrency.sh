#!/usr/bin/env bash
set -euo pipefail
conversion_container="$1"
conversion_output="$(mktemp -d)"
trap 'rm -rf "$conversion_output"' EXIT

conversion_temp_id="$(docker exec -i "$conversion_container" psql -U postgres -v ON_ERROR_STOP=1 -Atq <<'SQL'
insert into auth.users(id,email) values ('33333333-3333-3333-3333-333333333333','concurrent@accounts.cookmarked.edw20009.workers.dev');
insert into public.temp_recipe(user_id,title)
 select user_id,'Concurrent source' from public.profile where username='concurrent' returning recipe_id;
-- Make the two clients overlap without asserting anything about elapsed time.
create function public.slow_test_insert() returns trigger language plpgsql as $$
begin perform pg_sleep(0.2); return new; end $$;
create trigger slow_test_insert before insert on public.recipe for each row execute function public.slow_test_insert();
SQL
)"
if [[ ! "$conversion_temp_id" =~ ^[0-9]+$ ]]; then
  echo 'Failed to create concurrency fixture.' >&2
  exit 1
fi

convert_once() {
  docker exec -i "$conversion_container" psql -U postgres -v ON_ERROR_STOP=1 -Atq -v temp_id="$conversion_temp_id" <<'SQL'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.convert_temp_recipe(:temp_id, '{"title":"Concurrent save","prep_time":"10 min","ingredients":"Water","instructions":"Boil","servings":4,"meal_type":"N/A","course":"N/A"}');
SQL
}
convert_once > "$conversion_output/first" &
conversion_first_pid=$!
convert_once > "$conversion_output/second" &
conversion_second_pid=$!
wait "$conversion_first_pid"
wait "$conversion_second_pid"
if ! cmp -s "$conversion_output/first" "$conversion_output/second"; then
  echo 'Concurrent conversions returned different results.' >&2
  exit 1
fi
conversion_valid="$(docker exec -i "$conversion_container" psql -U postgres -v ON_ERROR_STOP=1 -Atq <<'SQL'
select (select count(*) from public.recipe where title='Concurrent save')=1
 and (select count(*) from public.recipe_conversion)=1
 and (select count(*) from public.temp_recipe)=0;
SQL
)"
if [[ "$conversion_valid" != 't' ]]; then
  echo 'Concurrent conversion did not commit exactly one recipe and one receipt.' >&2
  exit 1
fi
echo 'Concurrent conversion retries returned the same saved recipe.'
