import { getReportsData } from "@/lib/reports";
import { getPeriodRange } from "@/lib/dashboardPeriod";
import { ReportsClient } from "@/components/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { start, end } = getPeriodRange("this_month")!;
  const initialData = await getReportsData(start, end);
  return <ReportsClient initialData={initialData} />;
}
