import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { vendors, crabs, batches } from "@/db/schema";
import { apiError, NotFoundError, parseId, withApiErrors } from "@/lib/api";

const vendorUpdate = z.object({
  name: z.string().trim().min(1).optional(),
  contactPhone: z.string().trim().min(1).nullish(),
  location: z.string().trim().min(1).nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/vendors/[id]">) => {
  const id = parseId((await ctx.params).id, "vendor");
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
  if (!vendor) throw new NotFoundError("Vendor not found");

  const [{ crabCount }] = await db
    .select({ crabCount: sql<number>`count(*)` })
    .from(crabs)
    .where(eq(crabs.vendorId, id));
  const [{ batchCount }] = await db
    .select({ batchCount: sql<number>`count(*)` })
    .from(batches)
    .where(eq(batches.primaryVendorId, id));

  return NextResponse.json({ data: { ...vendor, crabCount, batchCount } });
});

export const PATCH = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/vendors/[id]">) => {
  const id = parseId((await ctx.params).id, "vendor");
  const body = vendorUpdate.parse(await req.json());
  const [updated] = await db.update(vendors).set(body).where(eq(vendors.id, id)).returning();
  if (!updated) throw new NotFoundError("Vendor not found");
  return NextResponse.json({ data: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/vendors/[id]">) => {
  const id = parseId((await ctx.params).id, "vendor");
  const [{ crabCount }] = await db
    .select({ crabCount: sql<number>`count(*)` })
    .from(crabs)
    .where(eq(crabs.vendorId, id));
  if (crabCount > 0) {
    return apiError(`Cannot delete: ${crabCount} crab record(s) reference this vendor`, 409);
  }
  const [deleted] = await db.delete(vendors).where(eq(vendors.id, id)).returning();
  if (!deleted) throw new NotFoundError("Vendor not found");
  return NextResponse.json({ data: deleted });
});
