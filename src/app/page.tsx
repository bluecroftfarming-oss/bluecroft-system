import { getDashboardSummary } from "@/lib/dashboard";
import { getPeriodStats } from "@/lib/dashboardPeriod";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

// This page reads the live database on every request. Without this, Next.js
// prerenders it as static HTML at build time and every visitor gets a frozen
// snapshot from whenever `next build` last ran.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, period] = await Promise.all([getDashboardSummary(), getPeriodStats("today")]);
  return <DashboardClient initialSummary={summary} initialPeriod={period} />;
}
