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

if ! is_postgres_url "$DATABASE_URL_RAW"; then
  echo "[startup] Invalid DATABASE_URL. It must start with postgres:// or postgresql://."
  echo "[startup] If you use Railway, map DATABASE_URL to a real DB URL value (not a literal placeholder like \${{Postgres.DATABASE_URL}})."
  echo "[startup] You can also expose PGHOST, PGPORT, PGUSER, PGPASSWORD, and PGDATABASE; this script will build DATABASE_URL from them."
  exit 1
fi

export DATABASE_URL="$DATABASE_URL_RAW"

echo "[startup] Running Prisma migrations..."
npx prisma migrate deploy

echo "[startup] Starting API server..."
node src/server.js
