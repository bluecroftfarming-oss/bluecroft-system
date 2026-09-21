import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { crabs, vendors, systemBoxes, transactions } from "@/db/schema";

const MORTALITY_STATUSES = ["MORTALITY", "RESERVE_MORTALITY", "TRANSPORT_MORTALITY", "MOLTING_MORTALITY"];

/** Shared by the /api/dashboard route and the server-rendered dashboard page, so both stay in sync
 * without an extra network hop for the initial page load. */
export async function getDashboardSummary() {
  const [[{ totalCrabs }], statusRows, needsReviewRow, boxRow, vendorRows, monthlyRows, txRows, gradeRows] =
    await Promise.all([
      db.select({ totalCrabs: sql<number>`count(*)` }).from(crabs),
      db
        .select({ status: crabs.status, count: sql<number>`count(*)` })
        .from(crabs)
        .groupBy(crabs.status),
      db
        .select({ count: sql<number>`count(*)` })
        .from(crabs)
        .where(eq(crabs.needsReview, true)),
      db
        .select({
          totalBoxes: sql<number>`(select count(*) from ${systemBoxes})`,
          occupiedBoxes: sql<number>`count(distinct ${crabs.currentSystemBoxId})`,
        })
        .from(crabs)
        .where(eq(crabs.status, "IN_SYSTEM")),
      db
        .select({
          vendorId: vendors.id,
          name: vendors.name,
          totalCrabs: sql<number>`count(*)`,
          mortalityCount: sql<number>`sum(case when ${crabs.status} in ('MORTALITY','RESERVE_MORTALITY','TRANSPORT_MORTALITY','MOLTING_MORTALITY') then 1 else 0 end)`,
          hardCount: sql<number>`sum(case when ${crabs.status} = 'HARD' then 1 else 0 end)`,
        })
        .from(crabs)
        .innerJoin(vendors, eq(crabs.vendorId, vendors.id))
        .groupBy(vendors.id, vendors.name)
        .orderBy(sql`count(*) desc`)
        .limit(15),
      db
        .select({
          month: sql<string>`substr(${crabs.intakeDate}, 1, 7)`,
          count: sql<number>`count(*)`,
        })
        .from(crabs)
        .where(sql`${crabs.intakeDate} is not null`)
        .groupBy(sql`substr(${crabs.intakeDate}, 1, 7)`)
        .orderBy(sql`substr(${crabs.intakeDate}, 1, 7)`),
      db
        .select({
          type: transactions.type,
          total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .groupBy(transactions.type),
      db
        .select({ grade: crabs.grade, count: sql<number>`count(*)` })
        .from(crabs)
        .where(eq(crabs.status, "IN_SYSTEM"))
        .groupBy(crabs.grade),
    ]);

  const statusBreakdown = statusRows.map((r) => ({
    status: r.status,
    count: r.count,
    pct: totalCrabs > 0 ? Math.round((r.count / totalCrabs) * 1000) / 10 : 0,
  }));

  const mortalityCount = statusRows
    .filter((r) => MORTALITY_STATUSES.includes(r.status))
    .reduce((sum, r) => sum + r.count, 0);

  const vendorScorecard = vendorRows.map((v) => ({
    vendorId: v.vendorId,
    name: v.name,
    totalCrabs: v.totalCrabs,
    mortalityCount: v.mortalityCount,
    mortalityPct: v.totalCrabs > 0 ? Math.round((v.mortalityCount / v.totalCrabs) * 1000) / 10 : 0,
    hardCount: v.hardCount,
    hardPct: v.totalCrabs > 0 ? Math.round((v.hardCount / v.totalCrabs) * 1000) / 10 : 0,
  }));

  return {
    overview: {
      totalCrabs,
      inSystem: statusRows.find((r) => r.status === "IN_SYSTEM")?.count ?? 0,
      hard: statusRows.find((r) => r.status === "HARD")?.count ?? 0,
      mortalityAll: mortalityCount,
      mortalityRatePct: totalCrabs > 0 ? Math.round((mortalityCount / totalCrabs) * 1000) / 10 : 0,
      returned: statusRows.find((r) => r.status === "RETURNED")?.count ?? 0,
      missing: statusRows.find((r) => r.status === "MISSING")?.count ?? 0,
      needsReviewCount: needsReviewRow[0]?.count ?? 0,
    },
    statusBreakdown,
    boxOccupancy: {
      totalBoxes: boxRow[0]?.totalBoxes ?? 0,
      occupiedBoxes: boxRow[0]?.occupiedBoxes ?? 0,
    },
    vendorScorecard,
    monthlyIntake: monthlyRows,
    financials: txRows,
    gradeBreakdown: gradeRows,
    liveInSystemTotal: gradeRows.reduce((sum, r) => sum + r.count, 0),
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
