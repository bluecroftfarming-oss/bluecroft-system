import { format } from "date-fns";

/** Today's calendar date in the farm's local timezone (Asia/Kolkata), as an
 * ISO yyyy-MM-dd string — independent of the server's own timezone. Used to
 * stamp timeline events and other "as of today" writes. */
export function todayIST(): string {
  const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return format(new Date(istString), "yyyy-MM-dd");
}
