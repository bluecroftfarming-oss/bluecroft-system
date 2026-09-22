import { NextRequest, NextResponse } from "next/server";
import { getReportsData } from "@/lib/reports";
import { apiError, withApiErrors } from "@/lib/api";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withApiErrors(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const start = sp.get("start") ?? "";
  const end = sp.get("end") ?? "";
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    return apiError("Provide start and end as YYYY-MM-DD query params.", 400);
  }
  if (start > end) {
    return apiError("Start date must be on or before end date.", 400);
  }
  const data = await getReportsData(start, end);
  return NextResponse.json({ data });
});
