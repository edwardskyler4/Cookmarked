#!/usr/bin/env bash
set -euo pipefail

# Vanilla PostgreSQL is enough: bootstrap.sql provides the Supabase contracts.
# Override the image only for a one-off local run, never as a team requirement.
auth_test_image="${POSTGRES_TEST_IMAGE:-postgres:17}"
auth_test_name="cookmarked-auth-test-$$"
auth_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  docker rm --force "$auth_test_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach --rm --name "$auth_test_name" --network none \
  --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_HOST_AUTH_METHOD=trust "$auth_test_image" >/dev/null

for attempt in {1..60}; do
  if docker exec "$auth_test_name" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == 60 ]]; then
    docker logs "$auth_test_name"
    echo 'Authentication test database did not start.' >&2
    exit 1
  fi
  sleep 1
done

docker exec -i "$auth_test_name" psql -U postgres -v ON_ERROR_STOP=1 < "$auth_repo_root/supabase/tests/bootstrap.sql"
for migration in "$auth_repo_root"/supabase/migrations/*.sql; do
  docker exec -i "$auth_test_name" psql -U postgres -v ON_ERROR_STOP=1 < "$migration"
done
docker exec -i "$auth_test_name" psql -U postgres -v ON_ERROR_STOP=1 < "$auth_repo_root/supabase/tests/auth.sql"
echo 'Authentication database tests passed.'
