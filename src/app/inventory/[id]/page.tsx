import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { crabs, vendors, systemBoxes, batches, events, transactions, hardnessChecks, crabTimelineEvents } from "@/db/schema";
import { CrabDetailClient } from "@/components/inventory/CrabDetailClient";

export const dynamic = "force-dynamic";

export default async function CrabDetailPage({ params }: PageProps<"/inventory/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [[crab], crabEvents, crabTransactions, crabHardnessChecks, crabTimeline, vendorRows, boxRows, batchRows] =
    await Promise.all([
      db
        .select({
          id: crabs.id,
          legacyCrabNumber: crabs.legacyCrabNumber,
          batchId: crabs.batchId,
          batchNumber: batches.batchNumber,
          vendorId: crabs.vendorId,
          vendorName: vendors.name,
          currentSystemBoxId: crabs.currentSystemBoxId,
          systemBoxLabel: systemBoxes.label,
          intakeDate: crabs.intakeDate,
          intakeWeightGrams: crabs.intakeWeightGrams,
          gender: crabs.gender,
          grade: crabs.grade,
          inwardHardnessPct: crabs.inwardHardnessPct,
          status: crabs.status,
          exitDate: crabs.exitDate,
          exitWeightGrams: crabs.exitWeightGrams,
          purchasePrice: crabs.purchasePrice,
          saleOrReturnAmount: crabs.saleOrReturnAmount,
          legacyRemarks: crabs.legacyRemarks,
          needsReview: crabs.needsReview,
          reviewNote: crabs.reviewNote,
          createdAt: crabs.createdAt,
          updatedAt: crabs.updatedAt,
        })
        .from(crabs)
        .leftJoin(vendors, eq(crabs.vendorId, vendors.id))
        .leftJoin(systemBoxes, eq(crabs.currentSystemBoxId, systemBoxes.id))
        .leftJoin(batches, eq(crabs.batchId, batches.id))
        .where(eq(crabs.id, id)),
      db.select().from(events).where(eq(events.crabId, id)).orderBy(events.eventDate),
      db.select().from(transactions).where(eq(transactions.crabId, id)).orderBy(transactions.date),
      db.select().from(hardnessChecks).where(eq(hardnessChecks.crabId, id)).orderBy(hardnessChecks.checkDate),
      db
        .select()
        .from(crabTimelineEvents)
        .where(eq(crabTimelineEvents.crabId, id))
        .orderBy(crabTimelineEvents.eventDate, crabTimelineEvents.id),
      db.select().from(vendors).orderBy(vendors.name),
      db.select().from(systemBoxes).orderBy(systemBoxes.label),
      db.select().from(batches).orderBy(batches.batchNumber),
    ]);

  if (!crab) notFound();

  const boxLabelById = new Map(boxRows.map((b) => [b.id, b.label]));

  return (
    <CrabDetailClient
      crab={{
        ...crab,
        gender: crab.gender ?? "UNKNOWN",
        grade: crab.grade ?? "UNGRADED",
        status: crab.status ?? "IN_SYSTEM",
        needsReview: crab.needsReview ?? false,
        updatedAt: crab.updatedAt ?? "",
      }}
      events={crabEvents}
      transactions={crabTransactions}
      hardnessChecks={crabHardnessChecks}
      timeline={crabTimeline.map((t) => ({
        ...t,
        fromBoxLabel: t.fromSystemBoxId ? (boxLabelById.get(t.fromSystemBoxId) ?? null) : null,
        toBoxLabel: t.toSystemBoxId ? (boxLabelById.get(t.toSystemBoxId) ?? null) : null,
      }))}
      vendors={vendorRows.map((v) => ({ id: v.id, label: v.name }))}
      boxes={boxRows.map((b) => ({ id: b.id, label: b.label }))}
      batches={batchRows.map((b) => ({ id: b.id, label: `Batch ${b.batchNumber}` }))}
    />
  );
}
