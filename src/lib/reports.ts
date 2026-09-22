import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { crabs, vendors, transactions, systemBoxes } from "@/db/schema";

const MORTALITY_STATUSES = ["MORTALITY", "RESERVE_MORTALITY", "TRANSPORT_MORTALITY", "MOLTING_MORTALITY"];
type TxType = "PURCHASE" | "SALE" | "RETURN_REFUND";

/** Everything the Reports page needs for a given date range, computed fresh
 * from the source tables (crabs / transactions) — no denormalized reporting
 * tables to keep in sync. */
export async function getReportsData(start: string, end: string) {
  const [financialTotals, financialMonthly, statusRows, statusMonthlyRows, vendorRows, gradeRows, boxSummary] =
    await Promise.all([
      db
        .select({ type: transactions.type, total: sql<number>`coalesce(sum(${transactions.amount}), 0)`, count: sql<number>`count(*)` })
        .from(transactions)
        .where(and(gte(transactions.date, start), lte(transactions.date, end)))
        .groupBy(transactions.type),
      db
        .select({
          month: sql<string>`substr(${transactions.date}, 1, 7)`,
          type: transactions.type,
          total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(and(gte(transactions.date, start), lte(transactions.date, end)))
        .groupBy(sql`substr(${transactions.date}, 1, 7)`, transactions.type)
        .orderBy(sql`substr(${transactions.date}, 1, 7)`),
      db
        .select({ status: crabs.status, count: sql<number>`count(*)` })
        .from(crabs)
        .where(and(gte(crabs.exitDate, start), lte(crabs.exitDate, end)))
        .groupBy(crabs.status),
      db
        .select({ month: sql<string>`substr(${crabs.exitDate}, 1, 7)`, status: crabs.status, count: sql<number>`count(*)` })
        .from(crabs)
        .where(and(gte(crabs.exitDate, start), lte(crabs.exitDate, end)))
        .groupBy(sql`substr(${crabs.exitDate}, 1, 7)`, crabs.status)
        .orderBy(sql`substr(${crabs.exitDate}, 1, 7)`),
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
        .where(and(gte(crabs.intakeDate, start), lte(crabs.intakeDate, end)))
        .groupBy(vendors.id, vendors.name)
        .orderBy(sql`count(*) desc`)
        .limit(15),
      db
        .select({ grade: crabs.grade, count: sql<number>`count(*)` })
        .from(crabs)
        .where(and(gte(crabs.intakeDate, start), lte(crabs.intakeDate, end)))
        .groupBy(crabs.grade),
      db
        .select({
          totalBoxes: sql<number>`(select count(*) from ${systemBoxes})`,
          occupiedBoxes: sql<number>`count(distinct ${crabs.currentSystemBoxId})`,
        })
        .from(crabs)
        .where(eq(crabs.status, "IN_SYSTEM")),
    ]);

  const [reserveBox] = await db.select().from(systemBoxes).where(eq(systemBoxes.label, "In-box reserve"));
  let reserveOccupancy = 0;
  if (reserveBox) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(crabs)
      .where(and(eq(crabs.currentSystemBoxId, reserveBox.id), eq(crabs.status, "IN_SYSTEM")));
    reserveOccupancy = count;
  }

  const totalOf = (type: TxType) => financialTotals.find((r) => r.type === type)?.total ?? 0;
  const countOf = (type: TxType) => financialTotals.find((r) => r.type === type)?.count ?? 0;

  type FinancialMonthEntry = { month: string; PURCHASE: number; SALE: number; RETURN_REFUND: number };
  const financialMonthMap = new Map<string, FinancialMonthEntry>();
  for (const row of financialMonthly) {
    const entry = financialMonthMap.get(row.month) ?? { month: row.month, PURCHASE: 0, SALE: 0, RETURN_REFUND: 0 };
    entry[row.type as keyof Omit<FinancialMonthEntry, "month">] = row.total;
    financialMonthMap.set(row.month, entry);
  }

  const statusMonthMap = new Map<string, Record<string, number | string>>();
  for (const row of statusMonthlyRows) {
    const entry = statusMonthMap.get(row.month) ?? { month: row.month, mortality: 0, hard: 0, returned: 0, missing: 0, frozen: 0 };
    if (MORTALITY_STATUSES.includes(row.status)) entry.mortality = (entry.mortality as number) + row.count;
    else if (row.status === "HARD") entry.hard = row.count;
    else if (row.status === "RETURNED") entry.returned = row.count;
    else if (row.status === "MISSING") entry.missing = row.count;
    else if (row.status === "FROZEN") entry.frozen = row.count;
    statusMonthMap.set(row.month, entry);
  }

  const mortality = statusRows.filter((r) => MORTALITY_STATUSES.includes(r.status)).reduce((s, r) => s + r.count, 0);
  const hard = statusRows.find((r) => r.status === "HARD")?.count ?? 0;
  const returned = statusRows.find((r) => r.status === "RETURNED")?.count ?? 0;
  const missing = statusRows.find((r) => r.status === "MISSING")?.count ?? 0;
  const frozen = statusRows.find((r) => r.status === "FROZEN")?.count ?? 0;
  const concluded = mortality + hard + returned + missing + frozen;
  const pct = (n: number) => (concluded > 0 ? Math.round((n / concluded) * 1000) / 10 : 0);

  const totalPurchase = totalOf("PURCHASE");
  const totalSale = totalOf("SALE");
  const totalReturn = totalOf("RETURN_REFUND");

  return {
    range: { start, end },
    financials: {
      totalPurchase,
      totalSale,
      totalReturn,
      netCashFlow: totalSale + totalReturn - totalPurchase,
      countPurchase: countOf("PURCHASE"),
      countSale: countOf("SALE"),
      countReturn: countOf("RETURN_REFUND"),
      monthly: Array.from(financialMonthMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month))),
    },
    statuses: {
      counts: { mortality, hard, returned, missing, frozen },
      concluded,
      percentages: {
        outputPct: pct(hard + returned),
        mortalityPct: pct(mortality),
        hardPct: pct(hard),
      },
      monthly: Array.from(statusMonthMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month))),
    },
    vendorPerformance: vendorRows.map((v) => ({
      vendorId: v.vendorId,
      name: v.name,
      totalCrabs: v.totalCrabs,
      mortalityCount: v.mortalityCount,
      mortalityPct: v.totalCrabs > 0 ? Math.round((v.mortalityCount / v.totalCrabs) * 1000) / 10 : 0,
      hardCount: v.hardCount,
      hardPct: v.totalCrabs > 0 ? Math.round((v.hardCount / v.totalCrabs) * 1000) / 10 : 0,
    })),
    gradeIntake: gradeRows,
    intakeTotal: gradeRows.reduce((s, r) => s + r.count, 0),
    boxUtilization: {
      totalBoxes: boxSummary[0]?.totalBoxes ?? 0,
      occupiedBoxes: boxSummary[0]?.occupiedBoxes ?? 0,
      reserveOccupancy,
      reserveCapacity: reserveBox?.capacity ?? 10,
    },
  };
}

export type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
