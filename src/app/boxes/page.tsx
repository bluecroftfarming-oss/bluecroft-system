import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { systemBoxes, crabs } from "@/db/schema";
import { BoxesClient } from "@/components/boxes/BoxesClient";

// Reads the live database on every request — must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function BoxesPage() {
  const [boxRows, occupantRows] = await Promise.all([
    db
      .select({
        id: systemBoxes.id,
        label: systemBoxes.label,
        section: systemBoxes.section,
        capacity: systemBoxes.capacity,
        notes: systemBoxes.notes,
      })
      .from(systemBoxes)
      .orderBy(systemBoxes.label),
    // The occupant list is derived straight from `crabs` — never a denormalized
    // copy — so a box's displayed occupants can never drift from Inventory.
    db
      .select({
        id: crabs.id,
        legacyCrabNumber: crabs.legacyCrabNumber,
        grade: crabs.grade,
        gender: crabs.gender,
        intakeDate: crabs.intakeDate,
        currentSystemBoxId: crabs.currentSystemBoxId,
      })
      .from(crabs)
      .where(eq(crabs.status, "IN_SYSTEM")),
  ]);

  const normalizedOccupants = occupantRows.map((c) => ({
    ...c,
    grade: c.grade ?? "UNGRADED",
    gender: c.gender ?? "UNKNOWN",
  }));

  const occupantsByBox = new Map<number, typeof normalizedOccupants>();
  for (const c of normalizedOccupants) {
    if (c.currentSystemBoxId === null) continue;
    const list = occupantsByBox.get(c.currentSystemBoxId) ?? [];
    list.push(c);
    occupantsByBox.set(c.currentSystemBoxId, list);
  }

  const rows = boxRows.map((b) => {
    const occupants = occupantsByBox.get(b.id) ?? [];
    return { ...b, occupancy: occupants.length, occupants };
  });

  return <BoxesClient initialBoxes={rows} />;
}
