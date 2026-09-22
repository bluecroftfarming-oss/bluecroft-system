import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { vendors, crabs, batches } from "@/db/schema";
import { VendorsClient } from "@/components/vendors/VendorsClient";

// Reads the live database on every request — must not be statically prerendered.
export const dynamic = "force-dynamic";

async function getDuplicateHints(): Promise<Record<string, string[]>> {
  try {
    const reportPath = path.join(process.cwd(), "data/legacy/migration-report.json");
    const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    const hints: Record<string, string[]> = {};
    for (const pair of report.possibleDuplicateVendors ?? []) {
      const match = pair.match(/^"(.+)" ~ "(.+)"$/);
      if (!match) continue;
      const [, a, b] = match;
      (hints[a] ??= []).push(b);
      (hints[b] ??= []).push(a);
    }
    return hints;
  } catch {
    return {};
  }
}

export default async function VendorsPage() {
  const [vendorRows, duplicateHints] = await Promise.all([
    db
      .select({
        id: vendors.id,
        name: vendors.name,
        contactPhone: vendors.contactPhone,
        location: vendors.location,
        notes: vendors.notes,
        legacyAliases: vendors.legacyAliases,
        totalCrabs: sql<number>`count(${crabs.id})`,
        mortalityCount: sql<number>`sum(case when ${crabs.status} in ('MORTALITY','RESERVE_MORTALITY','TRANSPORT_MORTALITY','MOLTING_MORTALITY') then 1 else 0 end)`,
        hardCount: sql<number>`sum(case when ${crabs.status} = 'HARD' then 1 else 0 end)`,
        batchCount: sql<number>`(select count(*) from ${batches} where ${batches.primaryVendorId} = ${vendors.id})`,
      })
      .from(vendors)
      .leftJoin(crabs, eq(crabs.vendorId, vendors.id))
      .groupBy(vendors.id)
      .orderBy(sql`count(${crabs.id}) desc`),
    getDuplicateHints(),
  ]);

  const data = vendorRows.map((v) => ({
    ...v,
    mortalityPct: v.totalCrabs > 0 ? Math.round((v.mortalityCount / v.totalCrabs) * 1000) / 10 : 0,
    hardPct: v.totalCrabs > 0 ? Math.round((v.hardCount / v.totalCrabs) * 1000) / 10 : 0,
  }));

  return <VendorsClient initialVendors={data} duplicateHints={duplicateHints} />;
}
