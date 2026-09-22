import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { crabs, vendors, systemBoxes, batches, events, transactions, hardnessChecks } from "@/db/schema";
import { NotFoundError, parseId, withApiErrors } from "@/lib/api";

const GENDER = ["MALE", "FEMALE", "UNKNOWN"] as const;
const GRADE = ["XXL", "XL", "BIG", "MED", "SM", "LOCAL", "LC", "LLC", "MOLT", "UNGRADED"] as const;
const STATUS = [
  "IN_SYSTEM",
  "HARD",
  "MORTALITY",
  "TRANSPORT_MORTALITY",
  "RESERVE_MORTALITY",
  "MOLTING_MORTALITY",
  "RETURNED",
  "MISSING",
  "FROZEN",
] as const;

const crabUpdate = z.object({
  legacyCrabNumber: z.number().int().positive().nullish(),
  batchId: z.number().int().positive().nullish(),
  vendorId: z.number().int().positive().nullish(),
  currentSystemBoxId: z.number().int().positive().nullish(),
  intakeDate: z.string().trim().min(1).nullish(),
  intakeWeightGrams: z.number().nonnegative().nullish(),
  gender: z.enum(GENDER).optional(),
  grade: z.enum(GRADE).optional(),
  inwardHardnessPct: z.number().min(0).max(100).nullish(),
  status: z.enum(STATUS).optional(),
  exitDate: z.string().trim().min(1).nullish(),
  exitWeightGrams: z.number().nonnegative().nullish(),
  purchasePrice: z.number().nonnegative().nullish(),
  saleOrReturnAmount: z.number().nonnegative().nullish(),
  legacyRemarks: z.string().trim().min(1).nullish(),
  needsReview: z.boolean().optional(),
  reviewNote: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/crabs/[id]">) => {
  const id = parseId((await ctx.params).id, "crab");
  const [crab] = await db
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
    .where(eq(crabs.id, id));
  if (!crab) throw new NotFoundError("Crab not found");

  const [crabEvents, crabTransactions, crabHardnessChecks] = await Promise.all([
    db.select().from(events).where(eq(events.crabId, id)).orderBy(events.eventDate),
    db.select().from(transactions).where(eq(transactions.crabId, id)).orderBy(transactions.date),
    db.select().from(hardnessChecks).where(eq(hardnessChecks.crabId, id)).orderBy(hardnessChecks.checkDate),
  ]);

  return NextResponse.json({
    data: { ...crab, events: crabEvents, transactions: crabTransactions, hardnessChecks: crabHardnessChecks },
  });
});

export const PATCH = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/crabs/[id]">) => { 
  const id = parseId((await ctx.params).id, "crab");
  const body = crabUpdate.parse(await req.json());
  const [updated] = await db
    .update(crabs)
    .set({ ...body, updatedAt: sql`(current_timestamp)` })
    .where(eq(crabs.id, id))
    .returning();
  if (!updated) throw new NotFoundError("Crab not found");
  return NextResponse.json({ data: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/crabs/[id]">) => {
  const id = parseId((await ctx.params).id, "crab");
  const [deleted] = await db.delete(crabs).where(eq(crabs.id, id)).returning();
  if (!deleted) throw new NotFoundError("Crab not found");
  return NextResponse.json({ data: deleted });
});
