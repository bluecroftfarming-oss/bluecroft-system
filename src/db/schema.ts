/**
 * Bluecroft Farming — Crab Inventory System
 * Database schema (Drizzle ORM / SQLite)
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const vendors = sqliteTable("vendors", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    contactPhone: text("contact_phone"),
    location: text("location"),
    notes: text("notes"),
    legacyAliases: text("legacy_aliases"),
    createdAt: text("created_at").default(sql`(current_timestamp)`),
});
