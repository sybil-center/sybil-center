#!/bin/sh
# wait-for-postgres.sh

set -e

shift
cmd="$@"

until PGPASSWORD=$DB_PASSWORD psql -h "127.0.0.1" -p 5435 -U "verifier" -d "verifier" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec $cmd
