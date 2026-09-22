import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { systemBoxes, crabs } from "@/db/schema";
import { BoxesClient } from "@/components/boxes/BoxesClient";

// Reads the live database on every request — must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function BoxesPage() {
  const rows = await db
    .select({
      id: systemBoxes.id,
      label: systemBoxes.label,
      section: systemBoxes.section,
      capacity: systemBoxes.capacity,
      notes: systemBoxes.notes,
      // Written with literal, already-qualified identifiers rather than interpolating drizzle
      // column refs: inside a correlated subquery, ${crabs.x} / ${systemBoxes.id} render as bare
      // unqualified column names, so `id` would resolve to crabs.id (both tables have one) instead
      // of correlating to the outer system_boxes.id — silently producing 0 for every box.
      occupancy: sql<number>`(select count(*) from crabs where crabs.current_system_box_id = system_boxes.id and crabs.status = 'IN_SYSTEM')`,
    })
    .from(systemBoxes)
    .orderBy(systemBoxes.label);

  return <BoxesClient initialBoxes={rows} />;
}
