import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { vendors, crabs, batches } from "@/db/schema";
import { apiError, NotFoundError, parseId, withApiErrors } from "@/lib/api";

const mergeInput = z.object({ intoVendorId: z.number().int().positive() });

/** Folds one vendor's crabs and batches into another, then deletes the now-empty source vendor.
 * Used for the "possible duplicate" pairs the migration flagged — a human decision, done here
 * explicitly rather than auto-merged during import. */
export const POST = withApiErrors(async (req: NextRequest, ctx: RouteContext<"/api/vendors/[id]/merge">) => {
  const sourceId = parseId((await ctx.params).id, "vendor");
  const { intoVendorId } = mergeInput.parse(await req.json());

  if (sourceId === intoVendorId) {
    return apiError("Cannot merge a vendor into itself", 400);
  }

  const [source] = await db.select().from(vendors).where(eq(vendors.id, sourceId));
  if (!source) throw new NotFoundError("Source vendor not found");
  const [target] = await db.select().from(vendors).where(eq(vendors.id, intoVendorId));
  if (!target) throw new NotFoundError("Target vendor not found");

  await db.update(crabs).set({ vendorId: intoVendorId }).where(eq(crabs.vendorId, sourceId));
  await db.update(batches).set({ primaryVendorId: intoVendorId }).where(eq(batches.primaryVendorId, sourceId));

  // Keep the source name as a legacy alias on the surviving vendor, so the merge is traceable.
  const existingAliases = target.legacyAliases ? target.legacyAliases.split("|") : [];
  const newAliases = Array.from(new Set([...existingAliases, source.name])).join("|");
  await db.update(vendors).set({ legacyAliases: newAliases }).where(eq(vendors.id, intoVendorId));

  await db.delete(vendors).where(eq(vendors.id, sourceId));

  return NextResponse.json({ data: { mergedInto: intoVendorId } });
});
