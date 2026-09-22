import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { batches } from "@/db/schema";
import { withApiErrors } from "@/lib/api";

const batchInput = z.object({
  batchNumber: z.number().int().nonnegative(),
  intakeDate: z.string().trim().min(1).nullish(),
  primaryVendorId: z.number().int().positive().nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async () => {
  const rows = await db.select().from(batches).orderBy(desc(batches.batchNumber));
  return NextResponse.json({ data: rows });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = batchInput.parse(await req.json());
  const [created] = await db.insert(batches).values(body).returning();
  return NextResponse.json({ data: created }, { status: 201 });
});
