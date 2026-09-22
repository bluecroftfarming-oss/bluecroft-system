import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/dashboard";
import { withApiErrors } from "@/lib/api";

export const GET = withApiErrors(async () => {
  const data = await getDashboardSummary();
  return NextResponse.json({ data });
});
