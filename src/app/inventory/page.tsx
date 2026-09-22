import { desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { batches, crabs, systemBoxes, vendors } from "@/db/schema";
import { InventoryClient } from "@/components/inventory/InventoryClient";

const PAGE_SIZE = 25;

// Reads the live database on every request — must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [rows, [{ total }], [{ maxNumber }], vendorRows, boxRows, batchRows] = await Promise.all([
    db.select().from(crabs).orderBy(desc(crabs.id)).limit(PAGE_SIZE),
    db.select({ total: sql<number>`count(*)` }).from(crabs),
    db.select({ maxNumber: sql<number>`coalesce(max(${crabs.legacyCrabNumber}), 0)` }).from(crabs),
    db.select().from(vendors).orderBy(vendors.name),
    db.select().from(systemBoxes).orderBy(systemBoxes.label),
    db.select().from(batches).orderBy(desc(batches.batchNumber)),
  ]);

  // Attach display names the same way /api/crabs does, since the client table expects joined rows.
  const vendorNameById = new Map(vendorRows.map((v) => [v.id, v.name]));
  const boxLabelById = new Map(boxRows.map((b) => [b.id, b.label]));
  const batchNumberById = new Map(batchRows.map((b) => [b.id, b.batchNumber]));

  const initialRows = rows.map((r) => ({
    ...r,
    gender: r.gender ?? "UNKNOWN",
    grade: r.grade ?? "UNGRADED",
    status: r.status ?? "IN_SYSTEM",
    updatedAt: r.updatedAt ?? "",
    needsReview: r.needsReview ?? false,
    vendorName: r.vendorId ? (vendorNameById.get(r.vendorId) ?? null) : null,
    systemBoxLabel: r.currentSystemBoxId ? (boxLabelById.get(r.currentSystemBoxId) ?? null) : null,
    batchNumber: r.batchId ? (batchNumberById.get(r.batchId) ?? null) : null,
  }));

  return (
    <InventoryClient
      initialRows={initialRows}
      initialTotal={total}
      vendors={vendorRows.map((v) => ({ id: v.id, label: v.name }))}
      boxes={boxRows.map((b) => ({ id: b.id, label: b.label }))}
      batches={batchRows.map((b) => ({ id: b.id, label: `Batch ${b.batchNumber}` }))}
      maxLegacyNumber={maxNumber}
    />
  );
}
