const TONE_CLASSES: Record<string, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  bad: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "good" | "warn" | "bad" | "neutral" | "brand";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
