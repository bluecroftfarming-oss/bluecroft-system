#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS infra script, run directly with `node`, not bundled by Next/ESLint's TS ruleset */
/**
 * Idempotent startup migration — safe to run on every boot (local dev and the
 * Railway entrypoint both call this before starting the server).
 *
 * Plain CommonJS + better-sqlite3 directly (no drizzle-kit journal): this repo
 * never committed a drizzle migrations folder — the original schema was
 * baked straight into the seed db — so rather than bolt a migration-journal
 * baseline onto an already-populated production database, new schema/data
 * changes are applied here as idempotent, re-runnable SQL. Every statement
 * below is safe to execute against a database that has already been migrated.
 *
 * What this does:
 *   1. Creates the `crab_timeline_events` table (per-crab status/box history)
 *      if it doesn't exist yet.
 *   2. Creates the 'In-box reserve' box (capacity 10) if it doesn't exist.
 *   3. Defaults capacity=1 on every other box that doesn't have one set, so
 *      "one crab per box" has something concrete to enforce against.
 *   4. Moves any surplus crabs (a box holding more than one IN_SYSTEM crab)
 *      into 'In-box reserve', logging a BOX_TRANSFER timeline event for each.
 *   5. Backfills a single "Import from Excel" (2026-09-22) timeline entry for
 *      every crab that doesn't have any timeline events yet — i.e. every crab
 *      that existed before this feature shipped.
 */
const path = require("path");
const Database = require("better-sqlite3");

const GO_LIVE_DATE = "2026-09-22";
const RESERVE_BOX_LABEL = "In-box reserve";
const RESERVE_BOX_CAPACITY = 10;

function run() {
  const dbPath = path.join(process.cwd(), "data", "bluecroft.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const hasCrabsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='crabs'")
    .get();
  if (!hasCrabsTable) {
    console.log("[runtime-migrate] No crabs table yet — nothing to migrate (fresh/empty database).");
    db.close();
    return;
  }

  const migrate = db.transaction(() => {
    // 1. crab_timeline_events table
    db.exec(`
      CREATE TABLE IF NOT EXISTS crab_timeline_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crab_id INTEGER NOT NULL REFERENCES crabs(id),
        event_type TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT,
        from_system_box_id INTEGER REFERENCES system_boxes(id),
        to_system_box_id INTEGER REFERENCES system_boxes(id),
        note TEXT,
        event_date TEXT NOT NULL,
        created_at TEXT DEFAULT (current_timestamp)
      );
      CREATE INDEX IF NOT EXISTS idx_crab_timeline_events_crab_id ON crab_timeline_events(crab_id);
    `);

    // 2. 'In-box reserve' box
    let reserve = db.prepare("SELECT id, capacity FROM system_boxes WHERE label = ?").get(RESERVE_BOX_LABEL);
    if (!reserve) {
      db.prepare(
        "INSERT INTO system_boxes (label, section, capacity, notes) VALUES (?, ?, ?, ?)"
      ).run(
        RESERVE_BOX_LABEL,
        "Overflow",
        RESERVE_BOX_CAPACITY,
        "Holds crabs temporarily when their assigned box already has an occupant. Capacity 10."
      );
      reserve = db.prepare("SELECT id, capacity FROM system_boxes WHERE label = ?").get(RESERVE_BOX_LABEL);
      console.log(`[runtime-migrate] Created '${RESERVE_BOX_LABEL}' box (id ${reserve.id}, capacity ${RESERVE_BOX_CAPACITY}).`);
    } else if (reserve.capacity !== RESERVE_BOX_CAPACITY) {
      db.prepare("UPDATE system_boxes SET capacity = ? WHERE id = ?").run(RESERVE_BOX_CAPACITY, reserve.id);
    }
    const reserveBoxId = reserve.id;

    // 3. Default capacity=1 for every other box
    const capacityResult = db
      .prepare("UPDATE system_boxes SET capacity = 1 WHERE capacity IS NULL AND id != ?")
      .run(reserveBoxId);
    if (capacityResult.changes > 0) {
      console.log(`[runtime-migrate] Set default capacity=1 on ${capacityResult.changes} box(es).`);
    }

    // 4. Backfill "Import from Excel" for every crab that doesn't have an
    //    opening IMPORT entry yet. Done before the box-transfer cleanup below
    //    so a crab that gets auto-moved still keeps "Import from Excel" as
    //    its true opening entry, with the move appended after it.
    const backfillResult = db
      .prepare(
        `INSERT INTO crab_timeline_events (crab_id, event_type, to_status, note, event_date)
         SELECT id, 'IMPORT', status, 'Import from Excel', ?
         FROM crabs
         WHERE id NOT IN (SELECT DISTINCT crab_id FROM crab_timeline_events WHERE event_type = 'IMPORT')`
      )
      .run(GO_LIVE_DATE);
    if (backfillResult.changes > 0) {
      console.log(`[runtime-migrate] Backfilled opening timeline entry for ${backfillResult.changes} crab(s).`);
    }

    // 5. Move surplus crabs into the reserve box
    const overfullBoxes = db
      .prepare(
        `SELECT current_system_box_id AS boxId, COUNT(*) AS cnt
         FROM crabs
         WHERE status = 'IN_SYSTEM' AND current_system_box_id IS NOT NULL AND current_system_box_id != ?
         GROUP BY current_system_box_id
         HAVING COUNT(*) > 1`
      )
      .all(reserveBoxId);

    let movedCount = 0;
    for (const { boxId } of overfullBoxes) {
      const occupants = db
        .prepare(
          `SELECT id FROM crabs WHERE current_system_box_id = ? AND status = 'IN_SYSTEM' ORDER BY id ASC`
        )
        .all(boxId);
      // Keep the first (earliest-added) occupant in place; move the rest.
      for (const crab of occupants.slice(1)) {
        const reserveCountRow = db
          .prepare(`SELECT COUNT(*) AS c FROM crabs WHERE current_system_box_id = ? AND status = 'IN_SYSTEM'`)
          .get(reserveBoxId);
        if (reserveCountRow.c >= RESERVE_BOX_CAPACITY) {
          console.warn(
            `[runtime-migrate] WARNING: '${RESERVE_BOX_LABEL}' is full — crab #${crab.id} could not be auto-moved out of box ${boxId}. Needs manual attention.`
          );
          continue;
        }
        db.prepare("UPDATE crabs SET current_system_box_id = ?, updated_at = (current_timestamp) WHERE id = ?").run(
          reserveBoxId,
          crab.id
        );
        db.prepare(
          `INSERT INTO crab_timeline_events (crab_id, event_type, from_system_box_id, to_system_box_id, note, event_date)
           VALUES (?, 'BOX_TRANSFER', ?, ?, ?, ?)`
        ).run(
          crab.id,
          boxId,
          reserveBoxId,
          "Moved to In-box reserve automatically — its original box already had another crab in it (one-time data cleanup).",
          GO_LIVE_DATE
        );
        movedCount++;
      }
    }
    if (movedCount > 0) {
      console.log(`[runtime-migrate] Moved ${movedCount} surplus crab(s) into '${RESERVE_BOX_LABEL}'.`);
    }
  });

  migrate();
  console.log("[runtime-migrate] Done.");
  db.close();
}

run();
