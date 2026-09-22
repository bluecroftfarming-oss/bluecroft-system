import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { crabs, systemBoxes } from "@/db/schema";
import { ConflictError, NotFoundError } from "@/lib/api";

/** Throws a friendly ConflictError if placing a crab into `boxId` (as IN_SYSTEM)
 * would exceed that box's capacity. `excludeCrabId` lets a crab already sitting
 * in the box (e.g. an unrelated field edit that doesn't actually move it) skip
 * counting against itself. Every normal box holds exactly one crab; only
 * 'In-box reserve' is multi-occupant. */
export async function assertBoxHasRoom(boxId: number, excludeCrabId: number | null) {
  const [box] = await db.select().from(systemBoxes).where(eq(systemBoxes.id, boxId));
  if (!box) throw new NotFoundError("System box not found");

  const capacity = box.capacity ?? 1;
  const conditions = [eq(crabs.currentSystemBoxId, boxId), eq(crabs.status, "IN_SYSTEM")];
  if (excludeCrabId !== null) conditions.push(ne(crabs.id, excludeCrabId));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crabs)
    .where(and(...conditions));

  if (count >= capacity) {
    if (capacity === 1) {
      const [occupant] = await db
        .select({ legacyCrabNumber: crabs.legacyCrabNumber })
        .from(crabs)
        .where(and(eq(crabs.currentSystemBoxId, boxId), eq(crabs.status, "IN_SYSTEM")))
        .limit(1);
      const who = occupant?.legacyCrabNumber ? `Crab #${occupant.legacyCrabNumber}` : "another crab";
      throw new ConflictError(
        `Box "${box.label}" already has ${who} in it. Each box can only hold one crab — transfer the current occupant out first, or choose a different box.`
      );
    }
    throw new ConflictError(`"${box.label}" is at full capacity (${count}/${capacity} crabs).`);
  }
}
