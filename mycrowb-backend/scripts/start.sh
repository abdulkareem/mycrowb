#!/bin/sh
set -eu

normalize_url() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

is_postgres_url() {
  case "$1" in
    postgres://*|postgresql://*) return 0 ;;
    *) return 1 ;;
  esac
}

is_unresolved_placeholder() {
  case "$1" in
    ""|\$\{\{*\}\}|\$\{*) return 0 ;;
    *) return 1 ;;
  esac
}

pick_database_url() {
  for value in "$@"; do
    normalized_value="$(normalize_url "$value")"

    if [ -z "$normalized_value" ] || is_unresolved_placeholder "$normalized_value"; then
      continue
    fi

    if is_postgres_url "$normalized_value"; then
      printf '%s' "$normalized_value"
      return 0
    fi
  done

  return 1
}

build_database_url_from_pg_vars() {
  if [ -z "${PGHOST:-}" ] || [ -z "${PGPORT:-}" ] || [ -z "${PGUSER:-}" ] || [ -z "${PGPASSWORD:-}" ] || [ -z "${PGDATABASE:-}" ]; then
    return 1
  fi

  printf 'postgresql://%s:%s@%s:%s/%s' "$PGUSER" "$PGPASSWORD" "$PGHOST" "$PGPORT" "$PGDATABASE"
}

DATABASE_URL_RAW="$(pick_database_url \
  "${DATABASE_URL:-}" \
  "${DATABASE_PRIVATE_URL:-}" \
  "${DATABASE_PUBLIC_URL:-}" \
  "${POSTGRES_URL:-}" \
  "${POSTGRESQL_URL:-}" \
  "${POSTGRES_URL_NON_POOLING:-}" \
  "${POSTGRES_PRISMA_URL:-}" || true)"

if [ -z "$DATABASE_URL_RAW" ]; then
  DATABASE_URL_RAW="$(build_database_url_from_pg_vars || true)"
fi

if is_postgres_url "$DATABASE_URL_RAW"; then
  export DATABASE_URL="$DATABASE_URL_RAW"

  echo "[startup] Running Prisma migrations..."
  if ! npx prisma migrate deploy; then
    echo "[startup] WARNING: Prisma migration failed. Server will still start, but DB-backed endpoints may fail until DB connectivity is fixed."
  fi

  if [ ! -d "prisma/migrations" ]; then
    echo "[startup] No prisma/migrations directory found. Syncing schema with prisma db push..."
    if ! npx prisma db push --skip-generate; then
      echo "[startup] WARNING: Prisma db push failed. Server will still start, but DB-backed endpoints may fail until DB schema is created."
    fi
  fi
else
  echo "[startup] WARNING: DATABASE_URL is missing or invalid."
  echo "[startup] OTP request endpoint can still run with in-memory fallback, but DB-backed endpoints will fail."
  echo "[startup] Set DATABASE_URL (postgres:// or postgresql://) or PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE to enable DB features."
fi

echo "[startup] Starting API server..."
node src/server.js
