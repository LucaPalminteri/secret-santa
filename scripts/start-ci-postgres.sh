#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_ENV:?Run this script from a GitHub Actions job.}"
database=secret_santa_test
password=$(openssl rand -hex 24)
printf '::add-mask::%s\n' "$password"

container=$(POSTGRES_PASSWORD="$password" docker run --detach --rm \
  --publish 127.0.0.1::5432 \
  --env POSTGRES_PASSWORD \
  --env "POSTGRES_DB=$database" \
  postgres:17)
endpoint=$(docker port "$container" 5432/tcp)

# The image starts a socket-only server during initialization. Wait for TCP.
for attempt in {1..45}; do
  if docker exec "$container" pg_isready --host 127.0.0.1 --username postgres --dbname "$database" >/dev/null 2>&1; then
    printf 'TEST_DATABASE_URL=postgresql://postgres:%s@%s/%s\n' "$password" "$endpoint" "$database" >> "$GITHUB_ENV"
    exit 0
  fi
  sleep 1
done

printf 'The isolated PostgreSQL container did not become ready.\n' >&2
exit 1
