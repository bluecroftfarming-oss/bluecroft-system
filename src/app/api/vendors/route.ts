import { NextRequest, NextResponse } from "next/server";
import { asc, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { vendors } from "@/db/schema";
import { withApiErrors } from "@/lib/api";

const vendorInput = z.object({
  name: z.string().trim().min(1),
  contactPhone: z.string().trim().min(1).nullish(),
  location: z.string().trim().min(1).nullish(),
  notes: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const rows = await db
    .select()
    .from(vendors)
    .where(q ? like(vendors.name, `%${q}%`) : undefined)
    .orderBy(asc(vendors.name));
  return NextResponse.json({ data: rows });
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = vendorInput.parse(await req.json());
  const [created] = await db.insert(vendors).values(body).returning();
  return NextResponse.json({ data: created }, { status: 201 });
});
