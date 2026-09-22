import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { hardnessChecks } from "@/db/schema";
import { parseId, withApiErrors } from "@/lib/api";

const checkInput = z.object({
  checkDate: z.string().trim().min(1).nullish(),
  hardnessPct: z.number().min(0).max(100).nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/crabs/[id]/hardness-checks">) => {
  const crabId = parseId((await ctx.params).id, "crab");
  const rows = await db
    .select()
    .from(hardnessChecks)
    .where(eq(hardnessChecks.crabId, crabId))
    .orderBy(hardnessChecks.checkDate);
  return NextResponse.json({ data: rows });
});

export const POST = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/crabs/[id]/hardness-checks">) => {
  const crabId = parseId((await ctx.params).id, "crab");
  const body = checkInput.parse(await req.json());
  const [created] = await db.insert(hardnessChecks).values({ ...body, crabId }).returning();
  return NextResponse.json({ data: created }, { status: 201 });
});
