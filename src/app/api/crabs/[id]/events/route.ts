import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { parseId, withApiErrors } from "@/lib/api";

const EVENT_TYPE = [
  "TREATMENT",
  "BOX_TRANSFER",
  "INJURY",
  "MORTALITY_CAUSE",
  "QUALITY_NOTE",
  "BUYBACK_SALE",
  "GENERAL_NOTE",
] as const;
const CATEGORY = [
  "TRANSPORT",
  "SHELL_LIMB_DAMAGE",
  "DISEASE_BARNACLES",
  "WATER_QUALITY",
  "HANDLING",
  "UNKNOWN",
  "N_A",
] as const;

const eventInput = z.object({
  eventType: z.enum(EVENT_TYPE),
  eventDate: z.string().trim().min(1).nullish(),
  category: z.enum(CATEGORY).default("N_A"),
  fromSystemBoxId: z.number().int().positive().nullish(),
  toSystemBoxId: z.number().int().positive().nullish(),
  description: z.string().trim().min(1).nullish(),
});

export const GET = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/crabs/[id]/events">) => {
  const crabId = parseId((await ctx.params).id, "crab");
  const rows = await db.select().from(events).where(eq(events.crabId, crabId)).orderBy(events.eventDate);
  return NextResponse.json({ data: rows });
});

export const POST = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/crabs/[id]/events">) => {
  const crabId = parseId((await ctx.params).id, "crab");
  const body = eventInput.parse(await req.json());
  const [created] = await db.insert(events).values({ ...body, crabId }).returning();
  return NextResponse.json({ data: created }, { status: 201 });
});
