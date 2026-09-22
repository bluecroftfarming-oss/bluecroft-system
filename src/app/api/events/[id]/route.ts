import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { NotFoundError, parseId, withApiErrors } from "@/lib/api";

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

const eventUpdate = z.object({
  eventType: z.enum(EVENT_TYPE).optional(),
  eventDate: z.string().trim().min(1).nullish(),
  category: z.enum(CATEGORY).optional(),
  fromSystemBoxId: z.number().int().positive().nullish(),
  toSystemBoxId: z.number().int().positive().nullish(),
  description: z.string().trim().min(1).nullish(),
});

export const PATCH = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/events/[id]">) => {
  const id = parseId((await ctx.params).id, "event");
  const body = eventUpdate.parse(await req.json());
  const [updated] = await db.update(events).set(body).where(eq(events.id, id)).returning();
  if (!updated) throw new NotFoundError("Event not found");
  return NextResponse.json({ data: updated });
});

export const DELETE = withApiErrors(async (_req: NextRequest, ctx: RouteContext<"/api/events/[id]">) => {
  const id = parseId((await ctx.params).id, "event");
  const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
  if (!deleted) throw new NotFoundError("Event not found");
  return NextResponse.json({ data: deleted });
});
