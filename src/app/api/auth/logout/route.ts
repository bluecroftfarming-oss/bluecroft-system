import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { withApiErrors } from "@/lib/api";

export const POST = withApiErrors(async () => {
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
});
