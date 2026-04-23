#!/bin/sh
set -e

DB_HOST="db"
DB_USER="chess"
DB_NAME="chess"
DB_PASS="${POSTGRES_PASSWORD:-chess_dev}"

echo "Waiting for database..."
until PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; do
  sleep 1
done

MIGRATIONS_DIR="/app/.output/server/db/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  echo "Running migrations..."
  for f in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$f" ] || continue
    echo "  Applying $(basename "$f")..."
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$f"
  done
fi

echo "Starting server..."
exec "$@"
