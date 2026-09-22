import { NextRequest, NextResponse } from "next/server";
import { getPeriodRange, getPeriodStats } from "@/lib/dashboardPeriod";
import type { PeriodValue } from "@/lib/meta";
import { apiError, withApiErrors } from "@/lib/api";

export const GET = withApiErrors(async (req: NextRequest) => {
  const range = req.nextUrl.searchParams.get("range") ?? "today";
  if (!getPeriodRange(range)) {
    return apiError(`Unknown range "${range}". Use one of: today, this_week, last_week, this_month, last_month.`, 400);
  }
  const data = await getPeriodStats(range as PeriodValue);
  return NextResponse.json({ data });
});
