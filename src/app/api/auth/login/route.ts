import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkCredentials, createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { apiError, withApiErrors } from "@/lib/api";

const loginInput = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const POST = withApiErrors(async (req: NextRequest) => {
  const body = loginInput.parse(await req.json());
  if (!checkCredentials(body.username, body.password)) {
    return apiError("Incorrect username or password.", 401);
  }
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION_COOKIE_NAME, createSessionToken(body.username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
});
