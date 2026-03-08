#!/bin/sh
set -eu

normalize_url() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

DATABASE_URL_RAW="${DATABASE_URL:-}"
DATABASE_URL_RAW="$(normalize_url "$DATABASE_URL_RAW")"

if [ -z "$DATABASE_URL_RAW" ] && [ -n "${DATABASE_PRIVATE_URL:-}" ]; then
  DATABASE_URL_RAW="$(normalize_url "$DATABASE_PRIVATE_URL")"
fi

if [ -z "$DATABASE_URL_RAW" ] && [ -n "${POSTGRES_URL:-}" ]; then
  DATABASE_URL_RAW="$(normalize_url "$POSTGRES_URL")"
fi

case "$DATABASE_URL_RAW" in
  postgres://*|postgresql://*)
    export DATABASE_URL="$DATABASE_URL_RAW"
    ;;
  *)
    echo "[startup] Invalid DATABASE_URL. It must start with postgres:// or postgresql://."
    echo "[startup] If you use Railway, set DATABASE_URL to \${{Postgres.DATABASE_URL}} or attach the Postgres service variable directly."
    exit 1
    ;;
esac

echo "[startup] Running Prisma migrations..."
npx prisma migrate deploy

echo "[startup] Starting API server..."
node src/server.js
