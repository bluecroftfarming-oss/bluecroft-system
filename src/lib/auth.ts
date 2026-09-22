/**
 * Minimal session auth for a small single-team app — no user table, no extra
 * dependencies. Credentials live in Railway env vars (AUTH_USERNAME,
 * AUTH_PASSWORD), never committed to git. A signed, httpOnly cookie carries a
 * short-lived session token (HMAC-signed with AUTH_SECRET, also an env var).
 */
import crypto from "crypto";

export const SESSION_COOKIE_NAME = "bluecroft_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  // Falls back to a fixed dev-only value so `next dev` works without env setup.
  // Production (Railway) must set a real AUTH_SECRET — see docker-entrypoint.sh.
  return process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expectedSig: string;
  try {
    expectedSig = sign(payload);
  } catch {
    return false;
  }
  if (!timingSafeEqualStr(sig, expectedSig)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.AUTH_USERNAME ?? "bluecroft";
  const expectedPass = process.env.AUTH_PASSWORD;
  if (!expectedPass) return false; // auth not configured — refuse rather than allow anything through
  return timingSafeEqualStr(username, expectedUser) && timingSafeEqualStr(password, expectedPass);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
