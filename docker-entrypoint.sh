#!/bin/sh
# Seeds the persistent volume with the migrated crab data on first boot, then
# starts the server. Safe to run on every restart — it only re-seeds when
# data/bluecroft.db is missing OR doesn't actually have the app's tables yet
# (e.g. a stale/empty file left behind by an earlier failed deploy), so live
# writes are never overwritten by a redeploy.
set -e

mkdir -p data

needs_seed=false
if [ ! -f data/bluecroft.db ]; then
  needs_seed=true
else
  has_table=$(node -e "
    try {
      const Database = require('better-sqlite3');
      const db = new Database('data/bluecroft.db', { fileMustExist: true });
      const row = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name='crabs'\").get();
      console.log(row ? 'yes' : 'no');
    } catch (e) {
      console.log('no');
    }
  ")
  if [ "$has_table" != "yes" ]; then
    needs_seed=true
  fi
fi

if [ "$needs_seed" = "true" ]; then
  if [ -f seed/bluecroft.seed.db ]; then
    echo "[entrypoint] No usable database found on the volume — seeding from migrated data (2,169 crabs, 43 vendors, 193 boxes)..."
    cp seed/bluecroft.seed.db data/bluecroft.db
  else
    echo "[entrypoint] No database and no seed file found — starting empty. Run migration manually if this is unexpected."
  fi
else
  echo "[entrypoint] Existing database found on the volume — using it as-is."
fi

# Idempotent schema/data migration — safe to run on every boot. Adds the
# crab_timeline_events table, the 'In-box reserve' box, box capacity
# defaults, and backfills opening timeline entries. See the script itself
# for details.
if [ -f data/bluecroft.db ]; then
  node scripts/runtime-migrate.cjs
fi

exec node_modules/.bin/next start -p "${PORT:-3000}"
