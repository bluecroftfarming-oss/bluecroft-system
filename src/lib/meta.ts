/** Shared display metadata for enums used across the UI — one place to tweak labels/colors. */

export const GRADES = ["XXL", "XL", "BIG", "MED", "SM", "LOCAL", "LC", "LLC", "MOLT", "UNGRADED"] as const;
export type Grade = (typeof GRADES)[number];

export const GENDERS = ["MALE", "FEMALE", "UNKNOWN"] as const;
export type Gender = (typeof GENDERS)[number];

export const STATUSES = [
  "IN_SYSTEM",
  "HARD",
  "MORTALITY",
  "TRANSPORT_MORTALITY",
  "RESERVE_MORTALITY",
  "MOLTING_MORTALITY",
  "RETURNED",
  "MISSING",
  "FROZEN",
] as const;
export type CrabStatus = (typeof STATUSES)[number];

export const MORTALITY_STATUSES: CrabStatus[] = [
  "MORTALITY",
  "TRANSPORT_MORTALITY",
  "RESERVE_MORTALITY",
  "MOLTING_MORTALITY",
];

export const STATUS_META: Record<CrabStatus, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  IN_SYSTEM: { label: "In System", tone: "neutral" },
  HARD: { label: "Hard (Sold)", tone: "good" },
  MORTALITY: { label: "Mortality", tone: "bad" },
  TRANSPORT_MORTALITY: { label: "Transport Mortality", tone: "bad" },
  RESERVE_MORTALITY: { label: "Reserve Mortality", tone: "bad" },
  MOLTING_MORTALITY: { label: "Molting Mortality", tone: "bad" },
  RETURNED: { label: "Returned", tone: "warn" },
  MISSING: { label: "Missing", tone: "warn" },
  FROZEN: { label: "Frozen", tone: "neutral" },
};

export const GRADE_LABELS: Record<Grade, string> = {
  XXL: "XXL",
  XL: "XL",
  BIG: "Big",
  MED: "Medium",
  SM: "Small",
  LOCAL: "Local",
  LC: "LC",
  LLC: "LLC",
  MOLT: "Molt",
  UNGRADED: "Ungraded",
};

export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
] as const;
export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];
