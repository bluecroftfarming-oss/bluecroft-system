import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { NotFoundError, parseId, withApiErrors } from "@/lib/api";

const TX_TYPE = ["PURCHASE", "SALE", "RETURN_REFUND"] as const;

const txUpdate = z.object({
  type: z.enum(TX_TYPE).optional(),
  amount: z.number().nonnegative().nullish(),
  date: z.string().trim().min(1).nullish(),
  counterpartyVendorId: z.number().int().positive().nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const PATCH = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/transactions/[id]">) => {
  const id = parseId((await ctx.params).id, "transaction");
  const body = txUpdate.parse(await req.json());
  const [updated] = await db.update(transactions).set(body).where(eq(transactions.id, id)).returning();
  if (!updated) throw new NotFoundError("Transaction not found");
  return NextResponse.json({ data: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/transactions/[id]">) => {
  const id = parseId((await ctx.params).id, "transaction");
  const [deleted] = await db.delete(transactions).where(eq(transactions.id, id)).returning();
  if (!deleted) throw new NotFoundError("Transaction not found");
  return NextResponse.json({ data: deleted });
});
