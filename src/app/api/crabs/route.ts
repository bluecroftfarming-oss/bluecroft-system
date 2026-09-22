import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { crabs, vendors, systemBoxes, batches } from "@/db/schema";
import { parsePagination, withApiErrors } from "@/lib/api";

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

const crabInput = z.object({
  legacyCrabNumber: z.number().int().positive().nullish(),
  batchId: z.number().int().positive().nullish(),
  vendorId: z.number().int().positive().nullish(),
  currentSystemBoxId: z.number().int().positive().nullish(),
  intakeDate: z.string().trim().min(1).nullish(),
  intakeWeightGrams: z.number().nonnegative().nullish(),
  gender: z.enum(GENDER).default("UNKNOWN"),
  grade: z.enum(GRADE).default("UNGRADED"),
  inwardHardnessPct: z.number().min(0).max(100).nullish(),
  status: z.enum(STATUS).default("IN_SYSTEM"),
  exitDate: z.string().trim().min(1).nullish(),
  exitWeightGrams: z.number().nonnegative().nullish(),
  purchasePrice: z.number().nonnegative().nullish(),
  saleOrReturnAmount: z.number().nonnegative().nullish(),
  legacyRemarks: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const { page, pageSize, offset } = parsePagination(sp);

  const conditions: SQL[] = [];
  const status = sp.get("status");
  if (status) conditions.push(eq(crabs.status, status as (typeof STATUS)[number]));
  const vendorId = sp.get("vendorId");
  if (vendorId) conditions.push(eq(crabs.vendorId, Number(vendorId)));
  const batchId = sp.get("batchId");
  if (batchId) conditions.push(eq(crabs.batchId, Number(batchId)));
  const systemBoxId = sp.get("systemBoxId");
  if (systemBoxId) conditions.push(eq(crabs.currentSystemBoxId, Number(systemBoxId)));
  const needsReview = sp.get("needsReview");
  if (needsReview === "true") conditions.push(eq(crabs.needsReview, true));
  const legacyCrabNumber = sp.get("legacyCrabNumber");
  if (legacyCrabNumber) conditions.push(eq(crabs.legacyCrabNumber, Number(legacyCrabNumber)));

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
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
      updatedAt: crabs.updatedAt,
    })
    .from(crabs)
    .leftJoin(vendors, eq(crabs.vendorId, vendors.id))
    .leftJoin(systemBoxes, eq(crabs.currentSystemBoxId, systemBoxes.id))
    .leftJoin(batches, eq(crabs.batchId, batches.id))
    .where(where)
    .orderBy(desc(crabs.id))
    .limit(pageSize)
    .offset(offset);

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(crabs).where(where);

  return NextResponse.json({ data: rows, pagination: { page, pageSize, total } });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = crabInput.parse(await req.json());
  const [created] = await db.insert(crabs).values(body).returning();
  return NextResponse.json({ data: created }, { status: 201 });
});
