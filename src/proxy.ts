import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/** Gate the whole app behind a login. Runs before every page/API request except
 * the ones excluded by `config.matcher` below (the login page itself, the
 * login/logout API, and static assets). */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (verifySessionToken(token)) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // API requests expect JSON, not an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/login") loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|bluecroft-logo.png).*)",
  ],
};
