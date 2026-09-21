import { and, gte, lte, sql } from "drizzle-orm";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { db } from "@/db/client";
import { crabs } from "@/db/schema";
import type { PeriodValue } from "@/lib/meta";

const MORTALITY_STATUSES = ["MORTALITY", "RESERVE_MORTALITY", "TRANSPORT_MORTALITY", "MOLTING_MORTALITY"];

/** "Today" as a calendar date in the farm's local timezone (Asia/Kolkata), independent of server TZ.
 * Stored intake/exit dates are plain calendar dates (no time component), so period boundaries are
 * computed and compared as plain yyyy-MM-dd strings. */
function todayIST(): Date {
  const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istString);
}

function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// Weeks are Monday–Sunday.
export function getPeriodRange(range: string): { start: string; end: string } | null {
  const today = todayIST();
  switch (range) {
    case "today":
      return { start: ymd(today), end: ymd(today) };
    case "this_week":
      return { start: ymd(startOfWeek(today, { weekStartsOn: 1 })), end: ymd(endOfWeek(today, { weekStartsOn: 1 })) };
    case "last_week": {
      const lw = subWeeks(today, 1);
      return { start: ymd(startOfWeek(lw, { weekStartsOn: 1 })), end: ymd(endOfWeek(lw, { weekStartsOn: 1 })) };
    }
    case "this_month":
      return { start: ymd(startOfMonth(today)), end: ymd(endOfMonth(today)) };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { start: ymd(startOfMonth(lm)), end: ymd(endOfMonth(lm)) };
    }
    default:
      return null;
  }
}

export async function getPeriodStats(range: PeriodValue) {
  const bounds = getPeriodRange(range)!;

  // "Concluded in period" = crabs whose EXIT DATE falls in the window — i.e. what happened during
  // this period, not what's still in progress. Crabs with a terminal status but no recorded exit
  // date (a data-entry gap) are not counted in any period — they still show up via needsReview.
  const inRange = and(gte(crabs.exitDate, bounds.start), lte(crabs.exitDate, bounds.end));

  const rows = await db
    .select({ status: crabs.status, count: sql<number>`count(*)` })
    .from(crabs)
    .where(inRange)
    .groupBy(crabs.status);

  const countOf = (statuses: string[]) =>
    rows.filter((r) => statuses.includes(r.status)).reduce((sum, r) => sum + r.count, 0);

  const mortality = countOf(MORTALITY_STATUSES);
  const returned = countOf(["RETURNED"]);
  const sales = countOf(["HARD"]);
  const missing = countOf(["MISSING"]);
  const frozen = countOf(["FROZEN"]);
  const concluded = mortality + returned + sales + missing + frozen;

  const pctOf = (n: number) => (concluded > 0 ? Math.round((n / concluded) * 1000) / 10 : 0);

  return {
    range,
    window: bounds,
    counts: { mortality, returned, sales, missing },
    concluded,
    percentages: {
      // Output % — successful outcomes (sold hard, or returned alive) vs. every crab that concluded
      // in this window. Mortality % / Hard % — each outcome's share of the same concluded total.
      outputPct: pctOf(sales + returned),
      mortalityPct: pctOf(mortality),
      hardPct: pctOf(sales),
    },
  };
}

export type PeriodStats = Awaited<ReturnType<typeof getPeriodStats>>;
