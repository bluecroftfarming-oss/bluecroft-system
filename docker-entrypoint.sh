#!/bin/sh
# Seeds the persistent volume with the migrated crab data on first boot, then
# starts the server. Safe to run on every restart — it only copies the seed
# in when data/bluecroft.db doesn't exist yet, so live writes are never
# overwritten by a redeploy.
set -e

# Relative to cwd (WORKDIR /app in the container) so this script also works
# when smoke-tested from a different root.
mkdir -p data

if [ ! -f data/bluecroft.db ]; then
  if [ -f seed/bluecroft.seed.db ]; then
    echo "[entrypoint] No database found on the volume — seeding from migrated data (2,169 crabs, 43 vendors, 193 boxes)..."
    cp seed/bluecroft.seed.db data/bluecroft.db
  else
    echo "[entrypoint] No database and no seed file found — starting empty. Run migration manually if this is unexpected."
  fi
else
  echo "[entrypoint] Existing database found on the volume — using it as-is."
fi

exec node_modules/.bin/next start -p "${PORT:-3000}"
