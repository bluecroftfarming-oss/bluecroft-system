import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { parseId, withApiErrors } from "@/lib/api";

const TX_TYPE = ["PURCHASE", "SALE", "RETURN_REFUND"] as const;

const txInput = z.object({
  type: z.enum(TX_TYPE),
  amount: z.number().nonnegative().nullish(),
  date: z.string().trim().min(1).nullish(),
  counterpartyVendorId: z.number().int().positive().nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/crabs/[id]/transactions">) => {
  const crabId = parseId((await ctx.params).id, "crab");
  const rows = await db.select().from(transactions).where(eq(transactions.crabId, crabId)).orderBy(transactions.date);
  return NextResponse.json({ data: rows });
});

export const POST = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/crabs/[id]/transactions">) => {
  const crabId = parseId((await ctx.params).id, "crab");
  const body = txInput.parse(await req.json());
  const [created] = await db.insert(transactions).values({ ...body, crabId }).returning();
  return NextResponse.json({ data: created }, { status: 201 });
});
