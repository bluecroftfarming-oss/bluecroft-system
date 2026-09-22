import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { systemBoxes } from "@/db/schema";
import { withApiErrors } from "@/lib/api";

const boxInput = z.object({
  label: z.string().trim().min(1),
  section: z.string().trim().min(1).nullish(),
  capacity: z.number().int().positive().nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async () => {
  const rows = await db.select().from(systemBoxes).orderBy(asc(systemBoxes.label));
  return NextResponse.json({ data: rows });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = boxInput.parse(await req.json());
  const [created] = await db.insert(systemBoxes).values(body).returning();
  return NextResponse.json({ data: created }, { status: 201 });
});
