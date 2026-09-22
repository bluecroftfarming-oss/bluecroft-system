import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { hardnessChecks } from "@/db/schema";
import { NotFoundError, parseId, withApiErrors } from "@/lib/api";

const checkUpdate = z.object({
  checkDate: z.string().trim().min(1).nullish(),
  hardnessPct: z.number().min(0).max(100).nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const PATCH = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/hardness-checks/[id]">) => {
  const id = parseId((await ctx.params).id, "hardness check");
  const body = checkUpdate.parse(await req.json());
  const [updated] = await db.update(hardnessChecks).set(body).where(eq(hardnessChecks.id, id)).returning();
  if (!updated) throw new NotFoundError("Hardness check not found");
  return NextResponse.json({ data: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/hardness-checks/[id]">) => {
  const id = parseId((await ctx.params).id, "hardness check");
  const [deleted] = await db.delete(hardnessChecks).where(eq(hardnessChecks.id, id)).returning();
  if (!deleted) throw new NotFoundError("Hardness check not found");
  return NextResponse.json({ data: deleted });
});
