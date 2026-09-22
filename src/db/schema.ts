/**
 * Bluecroft Farming — Crab Inventory System
 * Database schema (Drizzle ORM / SQLite)
 *
 * This replaces the flat, overloaded spreadsheet with a normalized structure:
 *   Vendor        — who we buy/return crabs to
 *   SystemBox     — physical holding units
 *   Batch         — a group of crabs intaken together (a "lot")
 *   Crab          — the core unit record (one row per crab, its whole lifecycle)
 *   HardnessCheck — repeating measurement log (replaces the ~37 ad hoc date columns)
 *   Event         — structured version of free-text "Remarks" (treatments, transfers,
 *                   injuries, causes of loss, buy-back notes)
 *   Transaction   — money log (purchase, sale, return/refund) — a crab can have more
 *                   than one, e.g. bought, returned/refunded, then later resold
 *
 * See /projects/.../claude/analysis_and_requirements.md for the analysis this is based on.
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Vendors — canonical, deduplicated list (the sheet had ~60 raw spellings of
// ~43 real vendors). Crabs reference this table instead of typing a name.
// ---------------------------------------------------------------------------
export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  contactPhone: text("contact_phone"),
  location: text("location"),
  notes: text("notes"),
  // Any raw spellings from the legacy sheet that were merged into this vendor,
  // kept for traceability during/after migration.
  legacyAliases: text("legacy_aliases"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// System Boxes — physical holding units. The sheet mixed box numbers with
// other data in the same cell (e.g. "121 / 12 / 17"); this table is the
// clean master list crabs get assigned to.
// ---------------------------------------------------------------------------
export const systemBoxes = sqliteTable("system_boxes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull().unique(), // e.g. "Box 41"
  section: text("section"), // optional physical grouping/location
  capacity: integer("capacity"), // max crabs it can hold, if known
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Batches — a group of crabs intaken together (usually same day + vendor lot).
// Kept lightweight; most reporting happens at the Crab level.
// ---------------------------------------------------------------------------
export const batches = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchNumber: integer("batch_number").notNull().unique(), // legacy "BATCH N"
  intakeDate: text("intake_date"), // ISO date (YYYY-MM-DD)
  primaryVendorId: integer("primary_vendor_id").references(() => vendors.id),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Crabs — the core inventory unit. One row per crab, whole lifecycle.
// ---------------------------------------------------------------------------
export const crabs = sqliteTable("crabs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  legacyCrabNumber: integer("legacy_crab_number"), // original "CRAB N" from the sheet, for traceability

  batchId: integer("batch_id").references(() => batches.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  currentSystemBoxId: integer("current_system_box_id").references(() => systemBoxes.id),

  // --- Intake ---
  intakeDate: text("intake_date"), // ISO date
  intakeWeightGrams: integer("intake_weight_grams"),
  gender: text("gender", { enum: ["MALE", "FEMALE", "UNKNOWN"] }).default("UNKNOWN"),
  grade: text("grade", {
    enum: ["XXL", "XL", "BIG", "MED", "SM", "LOCAL", "LC", "LLC", "MOLT", "UNGRADED"],
  }).default("UNGRADED"),
  inwardHardnessPct: real("inward_hardness_pct"),

  // --- Current status (denormalized for fast dashboard/list queries) ---
  status: text("status", {
    enum: ["IN_SYSTEM", "HARD", "MORTALITY", "TRANSPORT_MORTALITY", "RESERVE_MORTALITY",
           "MOLTING_MORTALITY", "RETURNED", "MISSING", "FROZEN"],
  }).notNull().default("IN_SYSTEM"),

  // --- Exit ---
  exitDate: text("exit_date"), // ISO date
  exitWeightGrams: integer("exit_weight_grams"),

  // --- Financials (summary; full history lives in `transactions`) ---
  purchasePrice: real("purchase_price"),
  saleOrReturnAmount: real("sale_or_return_amount"),

  legacyRemarks: text("legacy_remarks"), // original free-text Remarks, preserved as-is

  // Data-quality flag set by the migration script when a source row had an
  // ambiguous/unparseable date or other issue that needed a judgment call.
  needsReview: integer("needs_review", { mode: "boolean" }).default(false),
  reviewNote: text("review_note"),

  createdAt: text("created_at").default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Hardness Checks — repeating measurement, one row per check per crab.
// Replaces the ~37 fixed spreadsheet date-columns that staff were using as
// ad hoc sequential checkpoints rather than true calendar dates.
// ---------------------------------------------------------------------------
export const hardnessChecks = sqliteTable("hardness_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crabId: integer("crab_id").notNull().references(() => crabs.id),
  checkDate: text("check_date"), // ISO date
  hardnessPct: real("hardness_pct"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Events — structured version of the free-text "Remarks" column: treatments,
// box transfers, injuries, causes of loss, buy-back sale notes, etc.
// ---------------------------------------------------------------------------
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crabId: integer("crab_id").notNull().references(() => crabs.id),
  eventType: text("event_type", {
    enum: ["TREATMENT", "BOX_TRANSFER", "INJURY", "MORTALITY_CAUSE", "QUALITY_NOTE",
           "BUYBACK_SALE", "GENERAL_NOTE"],
  }).notNull(),
  eventDate: text("event_date"), // ISO date
  // Cause-of-loss / category taxonomy (starting set from the analysis; editable in-app)
  category: text("category", {
    enum: ["TRANSPORT", "SHELL_LIMB_DAMAGE", "DISEASE_BARNACLES", "WATER_QUALITY",
           "HANDLING", "UNKNOWN", "N_A"],
  }).default("N_A"),
  fromSystemBoxId: integer("from_system_box_id").references(() => systemBoxes.id),
  toSystemBoxId: integer("to_system_box_id").references(() => systemBoxes.id),
  description: text("description"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Crab Timeline Events — the per-crab status/box history shown on the crab
// detail page. Deliberately separate from `events` above (which holds the
// 309 structured notes carried over from the original Excel sheet, with real
// pre-go-live dates): every crab that existed before go-live gets exactly one
// IMPORT row here ("Import from Excel", dated 2026-09-22), and everything
// after go-live — status changes, box transfers, new intakes — is logged
// here going forward by the API itself.
// ---------------------------------------------------------------------------
export const crabTimelineEvents = sqliteTable("crab_timeline_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crabId: integer("crab_id").notNull().references(() => crabs.id),
  eventType: text("event_type", {
    enum: ["IMPORT", "CREATED", "STATUS_CHANGE", "BOX_TRANSFER"],
  }).notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  fromSystemBoxId: integer("from_system_box_id").references(() => systemBoxes.id),
  toSystemBoxId: integer("to_system_box_id").references(() => systemBoxes.id),
  note: text("note"),
  eventDate: text("event_date").notNull(), // ISO date
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Transactions — money log. A crab can have more than one (e.g. purchased,
// later returned for a refund, or an initial buy-back followed by a resale).
// ---------------------------------------------------------------------------
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  crabId: integer("crab_id").notNull().references(() => crabs.id),
  type: text("type", { enum: ["PURCHASE", "SALE", "RETURN_REFUND"] }).notNull(),
  amount: real("amount"),
  date: text("date"), // ISO date
  counterpartyVendorId: integer("counterparty_vendor_id").references(() => vendors.id),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});
