import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Standard JSON error response. */
export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Wraps a route handler body so thrown errors become consistent JSON responses
 * instead of an unhandled 500 with an HTML error page. */
export function withApiErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return apiError("Validation failed", 422, err.issues);
      }
      if (err instanceof NotFoundError) {
        return apiError(err.message, 404);
      }
      if (err instanceof ConflictError) {
        return apiError(err.message, 409);
      }
      const sqliteMessage = sqliteConstraintMessage(err);
      if (sqliteMessage) {
        return apiError(sqliteMessage, 409);
      }
      console.error(err);
      return apiError("Internal server error", 500);
    }
  };
}

export class NotFoundError extends Error {}

/** Any 409-worthy business-rule conflict (e.g. a box that's already occupied). */
export class ConflictError extends Error {}

/** Turns a better-sqlite3 constraint violation into a friendly message, or returns null for any
 * other error (which falls through to the generic 500 handler). */
function sqliteConstraintMessage(err: unknown): string | null {
  if (!(err instanceof Error) || !("code" in err)) return null;
  const code = (err as { code?: string }).code;
  if (code === "SQLITE_CONSTRAINT_UNIQUE") {
    const match = err.message.match(/UNIQUE constraint failed: (\w+)\.(\w+)/);
    if (match) {
      const [, table, column] = match;
      const friendlyField = column.replace(/_/g, " ");
      const friendlyTable = table.replace(/_/g, " ").replace(/s$/, "");
      return `A ${friendlyTable} with that ${friendlyField} already exists.`;
    }
    return "That value is already in use.";
  }
  if (code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return "That record references something that no longer exists.";
  }
  return null;
}

/** Parses a route param (string) as a positive integer id, or throws NotFoundError. */
export function parseId(raw: string, label = "record"): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new NotFoundError(`Invalid ${label} id`);
  }
  return id;
}

/** Parses `?page=&pageSize=` search params with sane defaults/caps. */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize")) || 50));
  return { page, pageSize, offset: (page - 1) * pageSize };
}
