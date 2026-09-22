import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { systemBoxes, crabs } from "@/db/schema";
import { apiError, NotFoundError, parseId, withApiErrors } from "@/lib/api";

const boxUpdate = z.object({
  label: z.string().trim().min(1).optional(),
  section: z.string().trim().min(1).nullish(),
  capacity: z.number().int().positive().nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/system-boxes/[id]">) => {
  const id = parseId((await ctx.params).id, "system box");
  const [box] = await db.select().from(systemBoxes).where(eq(systemBoxes.id, id));
  if (!box) throw new NotFoundError("System box not found");
  const occupants = await db
    .select({
      id: crabs.id,
      legacyCrabNumber: crabs.legacyCrabNumber,
      grade: crabs.grade,
      gender: crabs.gender,
      status: crabs.status,
      intakeDate: crabs.intakeDate,
    })
    .from(crabs)
    .where(and(eq(crabs.currentSystemBoxId, id), eq(crabs.status, "IN_SYSTEM")))
    .orderBy(crabs.id);
  return NextResponse.json({ data: { ...box, occupancy: occupants.length, occupants } });
});

export const PATCH = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/system-boxes/[id]">) => {
  const id = parseId((await ctx.params).id, "system box");
  const body = boxUpdate.parse(await req.json());
  const [updated] = await db.update(systemBoxes).set(body).where(eq(systemBoxes.id, id)).returning();
  if (!updated) throw new NotFoundError("System box not found");
  return NextResponse.json({ data: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/system-boxes/[id]">) => {
  const id = parseId((await ctx.params).id, "system box");
  const [{ occupancy }] = await db
    .select({ occupancy: sql<number>`count(*)` })
    .from(crabs)
    .where(eq(crabs.currentSystemBoxId, id));
  if (occupancy > 0) {
    return apiError(`Cannot delete: ${occupancy} crab record(s) currently reference this box`, 409);
  }
  const [deleted] = await db.delete(systemBoxes).where(eq(systemBoxes.id, id)).returning();
  if (!deleted) throw new NotFoundError("System box not found");
  return NextResponse.json({ data: deleted });
});
