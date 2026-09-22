import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { batches, crabs } from "@/db/schema";
import { apiError, NotFoundError, parseId, withApiErrors } from "@/lib/api";

const batchUpdate = z.object({
  batchNumber: z.number().int().nonnegative().optional(),
  intakeDate: z.string().trim().min(1).nullish(),
  primaryVendorId: z.number().int().positive().nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/batches/[id]">) => {
  const id = parseId((await ctx.params).id, "batch");
  const [batch] = await db.select().from(batches).where(eq(batches.id, id));
  if (!batch) throw new NotFoundError("Batch not found");
  const [{ crabCount }] = await db
    .select({ crabCount: sql<number>`count(*)` })
    .from(crabs)
    .where(eq(crabs.batchId, id));
  return NextResponse.json({ data: { ...batch, crabCount } });
});

export const PATCH = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/batches/[id]">) => {
  const id = parseId((await ctx.params).id, "batch");
  const body = batchUpdate.parse(await req.json());
  const [updated] = await db.update(batches).set(body).where(eq(batches.id, id)).returning();
  if (!updated) throw new NotFoundError("Batch not found");
  return NextResponse.json({ data: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/batches/[id]">) => {
  const id = parseId((await ctx.params).id, "batch");
  const [{ crabCount }] = await db
    .select({ crabCount: sql<number>`count(*)` })
    .from(crabs)
    .where(eq(crabs.batchId, id));
  if (crabCount > 0) {
    return apiError(`Cannot delete: ${crabCount} crab record(s) reference this batch`, 409);
  }
  const [deleted] = await db.delete(batches).where(eq(batches.id, id)).returning();
  if (!deleted) throw new NotFoundError("Batch not found");
  return NextResponse.json({ data: deleted });
});
